// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import {
	buildSeoAiRootPayload,
	buildSeoAiThreadPayloads,
	countFindingsByPriority,
	createSeoAiMarkdown,
	normalizeSeoAiReport,
} from "./seo-ai-report.mjs";

const context = {
	mode: "daily",
	reportDate: "2026-09-23",
	seo: {
		errors: 0,
		warnings: 2,
		issueGroups: [{ id: "seo:H1_COUNT_INVALID:h1", statusCounts: { new: 0 } }],
	},
	gsc: { status: "missing" },
	evidenceIds: ["seo:H1_COUNT_INVALID:h1"],
};

const finding = (overrides = {}) => ({
	priority: "P2",
	title: "기능 소개 지면에 대표 제목이 없음",
	impact: "검색엔진이 지면 주제를 파악하기 어렵습니다.",
	evidence: "h1 개수 0",
	suggestion: "h1을 하나 추가합니다.",
	codeRefs: ["apps/web/src/app/page.tsx:12"],
	evidenceIds: ["seo:H1_COUNT_INVALID:h1"],
	...overrides,
});

const rawReport = (overrides = {}) => ({
	status: "good",
	headline: "오늘은 조치할 문제가 하나 있습니다.",
	situation: { good: ["색인 정상"], concerns: ["h1 누락"] },
	findings: [finding()],
	roadmap: [{ when: "이번 주", action: "h1 추가" }],
	...overrides,
});

describe("normalizeSeoAiReport", () => {
	it("입력에 없는 근거만 인용한 발견은 버리고 버린 수를 남긴다", () => {
		const report = normalizeSeoAiReport({
			raw: rawReport({
				findings: [finding(), finding({ title: "지어낸 문제", evidenceIds: ["seo:MADE_UP:x"] })],
			}),
			context,
		});

		expect(report.findings.map((item) => item.title)).toEqual(["기능 소개 지면에 대표 제목이 없음"]);
		expect(report.droppedFindingCount).toBe(1);
	});

	it("저장소에 없는 파일 참조는 지우고 발견은 남긴다", () => {
		const report = normalizeSeoAiReport({
			raw: rawReport({
				findings: [finding({ codeRefs: ["apps/web/src/app/page.tsx:12", "apps/web/nowhere.tsx:3"] })],
			}),
			context,
			fileExists: (path) => path === "apps/web/src/app/page.tsx",
		});

		expect(report.findings[0].codeRefs).toEqual(["apps/web/src/app/page.tsx:12"]);
	});

	it("우선순위 순으로 정렬하고 잘못된 우선순위는 P3로 둔다", () => {
		const report = normalizeSeoAiReport({
			raw: rawReport({
				findings: [finding({ priority: "P9", title: "c" }), finding({ priority: "P0", title: "a" })],
			}),
			context,
		});

		expect(report.findings.map((item) => [item.priority, item.title])).toEqual([
			["P0", "a"],
			["P3", "c"],
		]);
	});

	it("오류가 있는데 모델이 good이라고 쓰면 critical로 올린다", () => {
		const report = normalizeSeoAiReport({
			raw: rawReport({ status: "good" }),
			context: { ...context, seo: { ...context.seo, errors: 1 } },
		});

		expect(report.status).toBe("critical");
	});

	it("색인 이탈이 있으면 최소 warning이다", () => {
		const report = normalizeSeoAiReport({
			raw: rawReport({ status: "good" }),
			context: { ...context, gsc: { indexChanges: { dropped: [{ url: "/a" }] } } },
		});

		expect(report.status).toBe("warning");
	});

	it("findings가 없는 출력은 문제 없음으로 넘기지 않고 던진다", () => {
		expect(() => normalizeSeoAiReport({ raw: "{\"status\":\"good\"}", context })).toThrow("findings");
		expect(() => normalizeSeoAiReport({ raw: "not json", context })).toThrow();
	});
});

describe("Slack 렌더링", () => {
	const report = normalizeSeoAiReport({ raw: rawReport(), context });

	it("본문에 상태·요약·우선순위 건수와 실행 링크를 싣는다", () => {
		const payload = buildSeoAiRootPayload({ report, context, runUrl: "https://github.com/run/1" });
		const text = payload.blocks.map((block) => block.text.text).join("\n");

		expect(payload.text).toContain("🟢 Web Memo SEO 일일 리포트 — 2026-09-23");
		expect(text).toContain("📋 P2 *1건*");
		expect(text).toContain("오류 0건 · 경고 2건");
		expect(text).toContain("<https://github.com/run/1|GitHub Actions 실행 결과>");
	});

	it("스레드는 상황·발견·로드맵 순서이고 모델 문장의 Slack 제어 문자를 이스케이프한다", () => {
		const payloads = buildSeoAiThreadPayloads({
			report: { ...report, situation: { good: ["<!channel> 정상"], concerns: [] } },
		});

		expect(payloads.map((payload) => payload.text)).toEqual([
			"지금 어떤 상황인가요?",
			"발견된 문제 상세",
			"개선 로드맵",
		]);
		expect(payloads[0].blocks[0].text.text).toContain("&lt;!channel&gt; 정상");
		expect(payloads[1].blocks[1].text.text).toContain("`apps/web/src/app/page.tsx:12`");
	});

	it("발견이 8건을 넘으면 스레드에는 8건만 싣고 나머지를 안내한다", () => {
		const many = { ...report, findings: Array.from({ length: 10 }, () => report.findings[0]) };
		const payloads = buildSeoAiThreadPayloads({ report: many });
		const texts = payloads[1].blocks.filter((block) => block.type === "section").map((block) => block.text.text);

		expect(texts).toHaveLength(1 + 8 + 1);
		expect(texts.at(-1)).toContain("나머지 2건");
	});

	it("Markdown에는 발견 전부와 근거 id를 남긴다", () => {
		const markdown = createSeoAiMarkdown({ report, context });

		expect(markdown).toContain("### P2 · 기능 소개 지면에 대표 제목이 없음");
		expect(markdown).toContain("seo:H1_COUNT_INVALID:h1");
		expect(countFindingsByPriority(report)).toEqual({ P0: 0, P1: 0, P2: 1, P3: 0 });
	});
});
