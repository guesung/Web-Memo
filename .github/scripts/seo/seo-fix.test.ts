// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import { fetchPreviousPullRequests } from "../shared/previous-pull-requests.mjs";
import {
	buildSeoFixBranchName,
	buildSeoFixPrBody,
	buildSeoFixPrTitle,
	collectRejectedEvidence,
	extractFinalResult,
	findDisallowedPaths,
	findUnsafeModeChanges,
	selectSeoFixTargets,
} from "./seo-fix.mjs";

const finding = (overrides = {}) => ({
	priority: "P1",
	title: "canonical 오류",
	impact: "영향",
	evidence: "근거",
	suggestion: "제안",
	codeRefs: ["apps/web/src/app/layout.tsx:12"],
	fixability: "code",
	evidenceIds: ["seo:CANONICAL:home"],
	...overrides,
});

describe("selectSeoFixTargets", () => {
	it("P0·P1·P2이고 허용 경로 안의 코드 위치가 있는 발견만 고른다", () => {
		const report = {
			findings: [
				finding(),
				finding({ priority: "P3", title: "사소한 것" }),
				finding({ priority: "P0", title: "위치 없음", codeRefs: [] }),
				finding({ priority: "P0", title: "워크플로만", codeRefs: [".github/workflows/report-seo.yml:3"] }),
			],
		};

		const targets = selectSeoFixTargets({ report });

		expect(targets.map((target) => target.title)).toEqual(["canonical 오류"]);
	});

	it("해결 방법이 코드 수정이 아닌 발견은 코드 위치가 있어도 고르지 않는다", () => {
		const report = {
			findings: [
				finding({ title: "콘텐츠 작업", fixability: "content" }),
				finding({ title: "색인 요청", fixability: "external" }),
				finding({ title: "값 없음", fixability: undefined }),
				finding({ title: "코드 수정" }),
			],
		};

		expect(selectSeoFixTargets({ report }).map((target) => target.title)).toEqual(["코드 수정"]);
	});

	it("허용 경로 밖의 위치는 빼고 안의 위치만 남긴다", () => {
		const report = {
			findings: [finding({ codeRefs: ["apps/web/next.config.ts:4", "package.json:1", "packages/ui/src/a.tsx"] })],
		};

		const [target] = selectSeoFixTargets({ report });

		expect(target.codeRefs).toEqual(["apps/web/next.config.ts:4", "packages/ui/src/a.tsx"]);
	});

	it("건수 제한에 걸리면 P2보다 P0·P1을 먼저 고른다", () => {
		const report = {
			findings: [
				finding({ priority: "P2", title: "내부 링크 부족" }),
				finding({ priority: "P2", title: "메타 길이" }),
				finding({ priority: "P1", title: "중복 메타" }),
				finding({ priority: "P0", title: "noindex" }),
			],
		};

		expect(selectSeoFixTargets({ report }).map((target) => target.title)).toEqual([
			"noindex",
			"중복 메타",
			"내부 링크 부족",
		]);
	});

	it("한 번에 3건까지만 고른다", () => {
		const report = { findings: Array.from({ length: 5 }, (_, index) => finding({ title: `발견 ${index}` })) };

		expect(selectSeoFixTargets({ report })).toHaveLength(3);
	});

	it("findings가 없으면 빈 배열이다", () => {
		expect(selectSeoFixTargets({ report: undefined })).toEqual([]);
		expect(selectSeoFixTargets({ report: { findings: [] } })).toEqual([]);
	});
});

describe("findDisallowedPaths", () => {
	it("허용 경로 안의 일반 소스는 통과시킨다", () => {
		expect(findDisallowedPaths({ paths: ["apps/web/src/app/layout.tsx", "packages/shared/src/a.ts"] })).toEqual([]);
	});

	it("워크플로·의존성·환경 파일·경로 이탈을 막는다", () => {
		const paths = [
			".github/workflows/report-seo.yml",
			"apps/web/package.json",
			"pnpm-lock.yaml",
			"apps/web/.env.local",
			"apps/web/../../.github/a.yml",
			"apps/web/node_modules/x/index.js",
			"apps/chrome-extension/manifest.js",
		];

		expect(findDisallowedPaths({ paths })).toEqual(paths);
	});
});

describe("findUnsafeModeChanges", () => {
	it("심볼릭 링크 생성과 권한 변경을 찾는다", () => {
		const summary = [
			" create mode 100644 apps/web/src/a.ts",
			" create mode 120000 apps/web/src/link",
			" mode change 100644 => 100755 apps/web/src/b.sh",
		].join("\n");

		expect(findUnsafeModeChanges({ summary })).toHaveLength(2);
	});

	it("일반 파일 생성은 허용한다", () => {
		expect(findUnsafeModeChanges({ summary: " create mode 100644 apps/web/src/a.ts" })).toEqual([]);
	});
});

describe("PR 메타데이터", () => {
	it("브랜치 이름에 UTC 날짜를 쓴다", () => {
		expect(buildSeoFixBranchName({ date: new Date("2026-09-30T00:17:00Z") })).toBe("claude/seo-fix-20260930");
	});

	it("제목에는 모델 문장 없이 건수만 쓴다", () => {
		const targets = [finding({ priority: "P0" }), finding(), finding()];

		expect(buildSeoFixPrTitle({ targets })).toBe("fix: SEO 리포트 P0 1건·P1 2건 자동 수정");
	});

	it("본문은 템플릿 섹션을 갖고 @멘션과 개행을 무력화한다", () => {
		const body = buildSeoFixPrBody({
			targets: [finding({ title: "@octocat 을 불러라\n## 가짜 섹션" })],
			runUrl: "https://github.com/o/r/actions/runs/1",
		});

		expect(body).toContain("## 설명");
		expect(body).toContain("## 관련 이슈");
		expect(body).toContain("## 변경 유형");
		expect(body).toContain("## 체크리스트");
		expect(body).not.toContain("@octocat");
		expect(body.match(/^## 가짜 섹션/m)).toBeNull();
		expect(body).toContain("actions/runs/1");
	});
});

describe("extractFinalResult", () => {
	it("실행 기록의 마지막 result 항목의 답변을 돌려준다", () => {
		const execution = [
			{ type: "assistant", message: "작업 중" },
			{ type: "result", result: "  원인이 코드에 없어 수정하지 않았습니다.  " },
		];

		expect(extractFinalResult({ execution })).toBe("원인이 코드에 없어 수정하지 않았습니다.");
	});

	it("답변이 없거나 형식이 다르면 빈 문자열이다", () => {
		expect(extractFinalResult({ execution: [{ type: "assistant" }] })).toBe("");
		expect(extractFinalResult({ execution: { type: "result", result: "x" } })).toBe("");
		expect(extractFinalResult({ execution: undefined })).toBe("");
	});
});

const LINE_702 =
	"- **P1 · 로케일 홈페이지(/ko, /en)가 sitemap에서 빠져 구글이 발견하지 못함** — gsc.inspections.notIndexed에 https://www.webmemo.xyz/ko, https://www.webmemo.xyz/en 이 coverageState 'URL is unknown to Google', lastCrawlTime null로 기록돼 있습니다. sitemap 생성 대상에서 빠집니다. (근거: gsc:not-indexed:https://www.webmemo.xyz/ko, gsc:not-indexed:https://www.webmemo.xyz/en) · 코드: `apps/web/src/app/sitemap.ts:36-39` `packages/shared/src/constants/generatedPagePaths.ts:6`";

const bodyOf = (...lines: string[]) => ["## 설명", "", "### 대상 발견", "", ...lines, "", "## 관련 이슈", ""].join("\n");

const previousPull = (overrides = {}) => ({
	number: 702,
	url: "",
	branch: "claude/seo-fix-20260101",
	state: "closed",
	title: "fix",
	body: bodyOf(LINE_702),
	closedAt: "2026-01-02T00:00:00Z",
	ownerComments: [],
	...overrides,
});

describe("collectRejectedEvidence", () => {
	it("닫힌 PR 본문의 마지막 근거 목록에서 ID를 읽는다(설명 문장의 쉼표·괄호와 URL 무관)", () => {
		const rejected = collectRejectedEvidence({ pullRequests: [previousPull()] });

		expect([...rejected.entries()]).toEqual([
			["gsc:not-indexed:https://www.webmemo.xyz/ko", 702],
			["gsc:not-indexed:https://www.webmemo.xyz/en", 702],
		]);
	});

	it("URL 근거 ID 안의 닫는 괄호는 ` · 코드:` 앞의 괄호만 목록 끝으로 본다", () => {
		const line = "- **P1 · t** — e (근거: gsc:page:https://a.com/x_(y), seo:T:home) · 코드: `apps/web/a.ts`";

		expect([...collectRejectedEvidence({ pullRequests: [previousPull({ body: bodyOf(line) })] }).keys()]).toEqual([
			"gsc:page:https://a.com/x_(y)",
			"seo:T:home",
		]);
	});

	it("본문이 멘션 방지로 넣은 zero-width space를 제거해 원래 ID로 되돌린다", () => {
		const line = "- **P1 · t** — e (근거: sentry:@\u200bscope/pkg) · 코드: `apps/web/a.ts`";

		expect([...collectRejectedEvidence({ pullRequests: [previousPull({ body: bodyOf(line) })] }).keys()]).toEqual([
			"sentry:@scope/pkg",
		]);
	});

	it("머지된 PR의 근거는 거절로 보지 않는다", () => {
		expect(collectRejectedEvidence({ pullRequests: [previousPull({ state: "merged" })] }).size).toBe(0);
	});

	it("이전 PR이 없거나 근거 부분이 없는 옛 본문은 건너뛴다", () => {
		const old = bodyOf("- **P1 · 제목** — 설명 · 코드: `apps/web/a.ts`");

		expect(collectRejectedEvidence({ pullRequests: [] }).size).toBe(0);
		expect(collectRejectedEvidence({ pullRequests: undefined }).size).toBe(0);
		expect(collectRejectedEvidence({ pullRequests: [previousPull({ body: old }), previousPull({ body: "" })] }).size).toBe(0);
	});

	it("코멘트가 있든 없든 같은 근거가 제외된다", () => {
		const withComment = collectRejectedEvidence({ pullRequests: [previousPull({ ownerComments: ["이건 고치지 마"] })] });
		const without = collectRejectedEvidence({ pullRequests: [previousPull()] });

		expect([...withComment.keys()]).toEqual([...without.keys()]);
		expect(without.size).toBe(2);
	});
});

describe("selectSeoFixTargets 이전에 닫힌 PR 제외", () => {
	const ko = "gsc:not-indexed:https://www.webmemo.xyz/ko";

	it("rejectedEvidenceIds가 없거나 비어 있으면 기존과 같다", () => {
		const report = { findings: [finding(), finding({ title: "둘째" })] };

		expect(selectSeoFixTargets({ report, rejectedEvidenceIds: undefined })).toEqual(selectSeoFixTargets({ report }));
		expect(selectSeoFixTargets({ report, rejectedEvidenceIds: [] })).toEqual(selectSeoFixTargets({ report }));
	});

	it("근거가 일부만 겹쳐도 제외하고, 다른 근거의 발견은 남긴다", () => {
		const report = {
			findings: [
				finding({ title: "겹침", evidenceIds: ["x:other", ko] }),
				finding({ title: "다름", evidenceIds: ["seo:CANONICAL:home"] }),
			],
		};

		expect(selectSeoFixTargets({ report, rejectedEvidenceIds: [ko] }).map((target) => target.title)).toEqual(["다름"]);
	});

	it("근거 ID가 빈 발견은 제외하지 않는다", () => {
		const report = { findings: [finding({ title: "빈 근거", evidenceIds: [] }), finding({ title: "없음", evidenceIds: undefined })] };

		expect(selectSeoFixTargets({ report, rejectedEvidenceIds: [ko] })).toHaveLength(2);
	});

	it("제외는 건수 제한 전에 적용돼 빠진 자리를 다음 우선순위가 채운다", () => {
		const report = {
			findings: [
				finding({ priority: "P0", title: "A", evidenceIds: [ko] }),
				finding({ priority: "P1", title: "B", evidenceIds: ["b"] }),
				finding({ priority: "P1", title: "C", evidenceIds: ["c"] }),
				finding({ priority: "P2", title: "D", evidenceIds: ["d"] }),
				finding({ priority: "P2", title: "E", evidenceIds: ["e"] }),
			],
		};

		expect(selectSeoFixTargets({ report, rejectedEvidenceIds: [ko] }).map((target) => target.title)).toEqual(["B", "C", "D"]);
	});
});

describe("이전 PR 조회와 조합", () => {
	const jsonResponse = (value: unknown) => ({ ok: true, status: 200, json: async () => value });

	const pull = (number: number, body: string, overrides = {}) => ({
		number,
		html_url: `https://github.com/o/r/pull/${number}`,
		title: "fix",
		body,
		state: "closed",
		merged_at: null,
		closed_at: new Date(Date.UTC(2026, 0, 1) + number * 60000).toISOString(),
		head: { ref: `claude/seo-fix-${number}`, repo: { full_name: "o/r" } },
		...overrides,
	});

	const lineFor = (id: string) => `- **P1 · t** — e (근거: ${id}) · 코드: \`apps/web/a.ts\``;

	const fakeFetch = (pulls: ReturnType<typeof pull>[], comments: Record<number, unknown[]> = {}) => async (url: string) => {
		const { pathname } = new URL(url);
		if (pathname === "/search/issues") {
			// 검색 API는 최근 갱신 순으로 돌려줍니다.
			return jsonResponse({ items: [...pulls].reverse().map((item) => ({ number: item.number })) });
		}
		const pullMatch = pathname.match(/\/pulls\/(\d+)$/);
		if (pullMatch) {
			return jsonResponse(pulls.find((item) => item.number === Number(pullMatch[1])));
		}
		const commentMatch = pathname.match(/\/issues\/(\d+)\/comments$/);

		return jsonResponse(comments[Number(commentMatch?.[1])] ?? []);
	};

	const load = (pulls: ReturnType<typeof pull>[], comments = {}) =>
		fetchPreviousPullRequests({
			repository: "o/r",
			token: "t",
			branchPrefix: "claude/seo-fix-",
			fetchImpl: fakeFetch(pulls, comments),
		});

	it("닫힘 PR은 소유자가 아닌 코멘트가 있어도 근거가 제외되고 머지된 PR은 제외되지 않는다", async () => {
		const pulls = [
			pull(10, bodyOf(lineFor("closed:id"))),
			pull(11, bodyOf(lineFor("merged:id")), { merged_at: "2026-01-02T00:00:00Z" }),
		];
		const comments = { 10: [{ author_association: "NONE", body: "스팸" }] };

		const previous = await load(pulls, comments);

		expect(previous.find((item) => item.number === 10)?.ownerComments).toEqual([]);
		expect([...collectRejectedEvidence({ pullRequests: previous }).entries()]).toEqual([["closed:id", 10]]);
	});

	it("최근에 닫힌 20건만 보므로 21번째 이후 PR의 근거는 제외 목록에 없다", async () => {
		const pulls = Array.from({ length: 25 }, (_, index) => pull(index + 1, bodyOf(lineFor(`id:${index + 1}`))));

		const rejected = collectRejectedEvidence({ pullRequests: await load(pulls) });

		expect(rejected.size).toBe(20);
		expect(rejected.has("id:25")).toBe(true);
		expect(rejected.has("id:6")).toBe(true);
		expect(rejected.has("id:5")).toBe(false);
		expect(rejected.has("id:1")).toBe(false);
	});
});
