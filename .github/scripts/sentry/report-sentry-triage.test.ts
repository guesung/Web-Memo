import { describe, expect, it } from "vitest";
import { buildPrBody, buildPrTitle, escapeMarkdown } from "./build-pr-body.mjs";
import {
	buildFailureText,
	buildResultText,
	buildSkipText,
	escapeSlack,
	normalizeAnalysis,
} from "./report-sentry-triage.mjs";

const rawAnalysis = {
	summary: "s",
	hypothesis: "null 이 들어옴",
	evidence: ["a.ts:1 x", "b.ts:2 y", "c.ts:3 z", "d.ts:4 w"],
	uncertainty: "재현 못 함",
	confidence: "medium",
	fix_applied: true,
	fix_summary: "가드 추가",
	tests_added: ["a.test.ts"],
};
const analysis = normalizeAnalysis(rawAnalysis);
const verify = { status: "passed", check: "success", typeCheck: "success", test: "success" };

describe("escapeSlack", () => {
	it("멘션·링크 문법과 길이를 무력화한다", () => {
		const text = escapeSlack("<!channel> <https://x|y> *bold*", 100);
		expect(text).not.toMatch(/[<>*]/);
		expect(escapeSlack("a".repeat(500), 10)).toHaveLength(11);
	});
});

describe("normalizeAnalysis", () => {
	it("깨진 출력은 null, 잘못된 확신도는 low", () => {
		expect(normalizeAnalysis("not json")).toBeNull();
		expect(normalizeAnalysis({ confidence: "wow" })?.confidence).toBe("low");
	});
});

describe("buildResultText", () => {
	const common = { shortId: "WEB-1", analysis, verify, runUrl: "https://run" };

	it("PR 이 있으면 링크와 근거 상위 3개를 싣는다", () => {
		const text = buildResultText({
			...common,
			patchCheck: { status: "ready" },
			prUrl: "https://github.com/o/r/pull/9",
		});
		expect(text).toContain("pull/9");
		expect(text).toContain("c.ts:3");
		expect(text).not.toContain("d.ts:4");
		expect(text).toContain("https://run");
	});

	it("패치 거부 사유를 보여준다", () => {
		const text = buildResultText({
			...common,
			patchCheck: { status: "rejected", reasons: [".github/x: 금지 경로"] },
			prUrl: "",
		});
		expect(text).toContain("패치 거부");
	});

	it("검증 실패면 PR 을 만들지 않았다고 알린다", () => {
		const text = buildResultText({
			...common,
			verify: { ...verify, status: "failed", test: "failure" },
			patchCheck: { status: "ready" },
			prUrl: "",
		});
		expect(text).toContain("검증에 실패");
	});

	it("검증이 건너뛰어졌으면 그 사유를 알린다", () => {
		const text = buildResultText({ ...common, verify: null, patchCheck: { status: "ready" }, prUrl: "" });
		expect(text).toContain("검증을 실행하지 못해");
	});

	it("수정 없음은 사유를 싣고, 분석을 못 읽으면 안내한다", () => {
		const none = normalizeAnalysis({ ...rawAnalysis, fix_applied: false, fix_summary: "확신 낮음" });
		expect(
			buildResultText({ ...common, analysis: none, patchCheck: { status: "none" }, prUrl: "" }),
		).toContain("수정 없음 — 확신 낮음");
		expect(buildResultText({ ...common, analysis: null, patchCheck: null, prUrl: "" })).toContain(
			"읽지 못했습니다",
		);
	});
});

describe("skip·failure 문구", () => {
	it("한 줄 사유와 실행 로그 링크", () => {
		expect(buildSkipText({ shortId: "W", reason: "상한" })).toContain("상한");
		expect(buildFailureText({ shortId: "W", runUrl: "https://run" })).toContain("원본 알림은 유지");
	});
});

describe("PR 본문", () => {
	const inputs = { issueId: "123", shortId: "WEB-1", projectSlug: "web-memo-web", action: "created" };

	it("레포 PR 형식과 자동 생성 고지를 포함한다", () => {
		const body = buildPrBody({
			inputs,
			analysis,
			patchCheck: { files: ["a.ts"], changedLines: 3 },
			verify,
			runUrl: "https://run",
		});
		for (const heading of ["## 설명", "## 관련 이슈", "## 변경 유형", "## 체크리스트"]) {
			expect(body).toContain(heading);
		}
		expect(body).toContain("https://guesung.sentry.io/issues/123/");
		expect(body).toContain("자동 머지·배포·Sentry resolve 를 하지 않습니다");
	});

	it("AI 문자열의 멘션을 무력화하고 제목은 한 줄 한글 접두", () => {
		expect(escapeMarkdown("@everyone <b>x</b>\nz")).not.toMatch(/@e|<b>|\n/);
		const title = buildPrTitle({
			shortId: "WEB-1",
			analysis: normalizeAnalysis({ ...rawAnalysis, fix_summary: "줄1\n줄2" }),
		});
		expect(title.startsWith("fix: Sentry WEB-1 ")).toBe(true);
		expect(title).not.toContain("\n");
	});
});
