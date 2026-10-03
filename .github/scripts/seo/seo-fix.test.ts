// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import {
	buildSeoFixBranchName,
	buildSeoFixPrBody,
	buildSeoFixPrTitle,
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
	it("P0·P1이고 허용 경로 안의 코드 위치가 있는 발견만 고른다", () => {
		const report = {
			findings: [
				finding(),
				finding({ priority: "P2", title: "메타 길이" }),
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
