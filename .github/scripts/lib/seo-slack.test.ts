import { describe, expect, it } from "vitest";
import {
	buildSeoFailureSlackPayload,
	buildSeoSlackPayload,
	collectSeoSlackIssues,
} from "./seo-slack.mjs";

const createReport = ({
	errors = [],
	newIssues = [],
	baselineStatus = "compatible",
	pageUrl = "https://www.webmemo.xyz/ko/introduce",
} = {}) => ({
	pages: [
		{
			url: pageUrl,
			agent: "mobile",
			issues: errors,
		},
	],
	history: {
		baselineStatus,
		delta: { new: newIssues, persistent: [], resolved: [], unobservable: [] },
	},
});

describe("collectSeoSlackIssues", () => {
	it("현재 오류와 compatible 기준선의 신규 경고만 추출한다", () => {
		const report = createReport({
			errors: [{ severity: "error", code: "NOINDEX", message: "차단" }],
			newIssues: [
				{ severity: "warning", code: "TITLE_SHORT", url: "https://example.com", agent: "pc" },
				{ severity: "error", code: "REQUEST_FAILED", url: "https://example.com", agent: "pc" },
			],
		});

		expect(collectSeoSlackIssues(report)).toEqual({
			errors: [
				expect.objectContaining({
					severity: "error",
					code: "NOINDEX",
					agent: "mobile",
				}),
			],
			newWarnings: [
				expect.objectContaining({ severity: "warning", code: "TITLE_SHORT" }),
			],
		});
	});

	it("기준선이 없으면 기존 경고를 신규 경고로 알리지 않는다", () => {
		const report = createReport({
			baselineStatus: "missing",
			newIssues: [{ severity: "warning", code: "TITLE_SHORT" }],
		});

		expect(collectSeoSlackIssues(report).newWarnings).toEqual([]);
	});
});

describe("buildSeoSlackPayload", () => {
	it("오류와 신규 경고가 없으면 메시지를 만들지 않는다", () => {
		expect(buildSeoSlackPayload({ report: createReport(), runUrl: "" })).toBeNull();
	});

	it("오류와 신규 경고 건수 및 실행 링크를 포함한다", () => {
		const report = createReport({
			errors: [{ severity: "error", code: "NOINDEX", field: "robots" }],
			newIssues: [
				{
					severity: "warning",
					code: "TITLE_SHORT",
					url: "https://example.com?a=1&b=2",
					agent: "pc",
				},
			],
		});

		const payload = buildSeoSlackPayload({
			report,
			runUrl: "https://github.com/example/actions/runs/1",
		});

		expect(payload?.text).toBe("🚨 SEO 감사: 오류 1건 · 신규 경고 1건");
		expect(payload?.blocks[0].text.text).toContain("`NOINDEX`");
		expect(payload?.blocks[0].text.text).toContain("a=1&amp;b=2");
		expect(payload?.blocks[0].text.text).toContain("GitHub Actions 실행 결과 보기");
	});

	it("아주 긴 이슈 값도 Slack section 글자 제한 안으로 축약한다", () => {
		const report = createReport({
			pageUrl: `https://example.com/?query=${"&".repeat(3_000)}`,
			errors: Array.from({ length: 20 }, (_, index) => ({
				severity: "error",
				code: `ERROR_${index}_${"C".repeat(200)}`,
				field: "F".repeat(300),
			})),
		});

		const payload = buildSeoSlackPayload({
			report,
			runUrl: "https://github.com/example/actions/runs/1",
		});

		expect(payload?.blocks[0].text.text.length).toBeLessThanOrEqual(3_000);
		expect(payload?.blocks[0].text.text).toContain("&amp;");
		expect(payload?.blocks[0].text.text).toContain("나머지 14건");
	});
});

describe("buildSeoFailureSlackPayload", () => {
	it("보고서 생성 실패와 실행 로그를 안내한다", () => {
		const payload = buildSeoFailureSlackPayload({ runUrl: "https://example.com/run" });

		expect(payload.text).toContain("보고서를 생성하기 전에 실패");
		expect(payload.blocks[0].text.text).toContain("https://example.com/run");
	});
});
