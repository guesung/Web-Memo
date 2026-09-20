import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildNotionPage,
	buildSlackPayload,
	findOpenAuditCard,
	normalizeAudit,
} from "./refactor-audit.mjs";

const FINDING = {
	title: "메모 훅이 UI와 데이터 가공을 함께 한다",
	severity: "high",
	category: "design",
	files: ["apps/web/src/a.ts:10"],
	problem: "컴포넌트 안에서 API 호출과 가공을 함께 한다",
	suggestion: "커스텀 훅으로 분리한다",
};

describe("normalizeAudit", () => {
	it("JSON 문자열도 객체도 같은 결과로 받는다", () => {
		const raw = { summary: "요약", findings: [FINDING] };

		expect(normalizeAudit(JSON.stringify(raw))).toEqual(normalizeAudit(raw));
	});

	it("findings 배열이 없으면 던진다", () => {
		expect(() => normalizeAudit({ summary: "요약" })).toThrow("findings");
		expect(() => normalizeAudit("null")).toThrow("findings");
	});

	// 빈 결과로 넘기면 점검이 깨진 주가 "발견 없음"으로 보고된다
	it("JSON이 아닌 문자열이면 던진다", () => {
		expect(() => normalizeAudit("점검 실패")).toThrow();
	});

	it("심각도 순으로 정렬하고 제목이 빈 항목은 버린다", () => {
		const audit = normalizeAudit({
			findings: [
				{ ...FINDING, title: "낮음", severity: "low" },
				{ ...FINDING, title: "  ", severity: "high" },
				{ ...FINDING, title: "높음", severity: "high" },
			],
		});

		expect(audit.findings.map((finding) => finding.title)).toEqual(["높음", "낮음"]);
	});

	it("모르는 심각도·분류는 낮음·퀄리티로 떨어지고 프로토타입 키에 속지 않는다", () => {
		const audit = normalizeAudit({
			findings: [{ ...FINDING, severity: "toString", category: "constructor" }],
		});

		expect(audit.findings[0]).toMatchObject({ severity: "low", category: "quality" });
	});

	it("상한을 넘으면 잘라내고 생략 건수를 센다", () => {
		const findings = Array.from({ length: 13 }, (_, index) => ({
			...FINDING,
			title: `항목 ${index}`,
		}));
		const audit = normalizeAudit({ findings });

		expect(audit.findings).toHaveLength(10);
		expect(audit.omittedCount).toBe(3);
	});

	it("노션 rich_text 상한(2000자)을 넘는 본문은 자른다", () => {
		const audit = normalizeAudit({
			findings: [{ ...FINDING, problem: "가".repeat(5000) }],
		});

		expect(audit.findings[0].problem.length).toBeLessThanOrEqual(1800);
	});
});

describe("buildNotionPage", () => {
	const audit = normalizeAudit({ summary: "요약", findings: [FINDING] });
	const page = buildNotionPage({
		databaseId: "db-id",
		audit,
		dateLabel: "2026-09-26",
		runUrl: "https://github.com/x/y/actions/runs/1",
	});

	// 비워 두면 러너가 기획 단계로 읽어 에이전트를 띄울 수 있다
	it("시작 단계를 논의로, 프로젝트를 웹 메모로 지정한다", () => {
		expect(page.properties["시작 단계"]).toEqual({ select: { name: "논의" } });
		expect(page.properties["프로젝트"]).toEqual({ select: { name: "웹 메모" } });
		expect(page.parent).toEqual({ database_id: "db-id" });
	});

	// /gs 스킬은 H1 두 개로 사람 자리와 AI 자리를 가른다
	it("본문은 인간 작성 → AI 작성 순서의 H1 골격을 갖고 점검 결과는 AI 작성 아래에 온다", () => {
		const headings = page.children
			.filter((block: { type: string }) => block.type.startsWith("heading"))
			.map((block: { type: string; [key: string]: unknown }) => {
				const richText = (block[block.type] as { rich_text: Array<{ text: { content: string } }> })
					.rich_text;

				return `${block.type}:${richText[0].text.content}`;
			});

		expect(headings.slice(0, 5)).toEqual([
			"heading_1:인간 작성",
			"heading_3:기획",
			"heading_3:설계",
			"heading_1:AI 작성",
			"heading_2:점검 결과",
		]);
	});
});

describe("buildSlackPayload", () => {
	it("발견이 없으면 링크 없이 한 줄만 보낸다", () => {
		const payload = buildSlackPayload({
			audit: normalizeAudit({ findings: [] }),
			cardUrl: null,
			runUrl: null,
		});

		expect(payload.text).toContain("찾지 못했습니다");
		expect(payload).not.toHaveProperty("blocks");
	});

	it("발견이 있으면 건수와 카드 링크를 싣는다", () => {
		const payload = buildSlackPayload({
			audit: normalizeAudit({ findings: [FINDING] }),
			cardUrl: "https://www.notion.so/card",
			runUrl: null,
		});

		expect(payload.text).toContain("1건");
		expect(JSON.stringify(payload.blocks)).toContain("https://www.notion.so/card");
	});

	// 상한에서 잘린 항목도 전체 후보 수에는 포함해야 사람이 카드를 열어 볼 이유를 안다
	it("생략된 항목까지 합쳐 전체 건수를 보여준다", () => {
		const findings = Array.from({ length: 12 }, (_, index) => ({
			...FINDING,
			title: `항목 ${index}`,
		}));
		const payload = buildSlackPayload({
			audit: normalizeAudit({ findings }),
			cardUrl: null,
			runUrl: null,
		});

		expect(payload.text).toContain("12건");
	});
});

describe("buildSlackPayload: 열린 카드가 있을 때", () => {
	it("새 카드를 만들지 않았다는 사실과 열린 카드 링크를 싣는다", () => {
		const payload = buildSlackPayload({
			audit: normalizeAudit({ findings: [FINDING] }),
			cardUrl: null,
			openCardUrl: "https://www.notion.so/open",
			runUrl: null,
		});

		expect(payload.text).toContain("새 카드는 만들지 않았습니다");
		expect(JSON.stringify(payload.blocks)).toContain("https://www.notion.so/open");
	});
});

describe("findOpenAuditCard", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const stubFetch = (results: Array<{ url: string }>) =>
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ results }), { status: 200 }),
		);

	// 완료되지 않은 자동 카드만 열린 것으로 본다. 필터가 바뀌면 중복 방지가 조용히 깨진다
	it("자동 표식·웹 메모·완료 아님 조건으로 조회한다", async () => {
		const fetchSpy = stubFetch([]);

		await findOpenAuditCard({ token: "secret", databaseId: "db-id" });

		const [url, options] = fetchSpy.mock.calls[0];
		expect(String(url)).toBe("https://api.notion.com/v1/databases/db-id/query");
		expect(options?.headers).toMatchObject({ authorization: "Bearer secret" });
		expect(JSON.parse(String(options?.body)).filter.and).toEqual([
			{ property: "이름", title: { contains: "(주간 자동)" } },
			{ property: "프로젝트", select: { equals: "웹 메모" } },
			{ property: "상태", status: { does_not_equal: "완료" } },
		]);
	});

	it("열린 카드가 있으면 URL을, 없으면 null을 돌려준다", async () => {
		stubFetch([{ url: "https://www.notion.so/open" }]);
		expect(await findOpenAuditCard({ token: "t", databaseId: "d" })).toBe(
			"https://www.notion.so/open",
		);

		vi.restoreAllMocks();
		stubFetch([]);
		expect(await findOpenAuditCard({ token: "t", databaseId: "d" })).toBeNull();
	});
});
