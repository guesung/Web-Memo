import { describe, expect, it, vi } from "vitest";
import { createActionsRunUrl, notifySeoSlack } from "./notify-seo-slack.mjs";

const createReport = ({ errors = [], newIssues = [] } = {}) => ({
	pages: [{ url: "https://example.com", agent: "pc", issues: errors }],
	history: {
		baselineStatus: "compatible",
		delta: { new: newIssues, persistent: [], resolved: [], unobservable: [] },
	},
});

describe("createActionsRunUrl", () => {
	it("GitHub 표준 환경변수로 실행 주소를 만든다", () => {
		expect(
			createActionsRunUrl({
				GITHUB_SERVER_URL: "https://github.com",
				GITHUB_REPOSITORY: "guesung/Web-Memo",
				GITHUB_RUN_ID: "123",
			}),
		).toBe("https://github.com/guesung/Web-Memo/actions/runs/123");
	});
});

describe("notifySeoSlack", () => {
	it("신규 경고가 없으면 Slack을 호출하지 않는다", async () => {
		const postMessage = vi.fn();

		const result = await notifySeoSlack({
			readReport: vi.fn().mockResolvedValue(JSON.stringify(createReport())),
			postMessage,
			webhookUrl: "https://hooks.slack.test/seo",
		});

		expect(result).toEqual({ status: "skipped", reason: "no_actionable_issues" });
		expect(postMessage).not.toHaveBeenCalled();
	});

	it("신규 경고가 있으면 리포트 웹훅으로 메시지를 보낸다", async () => {
		const postMessage = vi.fn().mockResolvedValue(undefined);
		const report = createReport({
			newIssues: [
				{ severity: "warning", code: "TITLE_SHORT", url: "https://example.com", agent: "pc" },
			],
		});

		const result = await notifySeoSlack({
			readReport: vi.fn().mockResolvedValue(JSON.stringify(report)),
			postMessage,
			webhookUrl: "https://hooks.slack.test/seo",
		});

		expect(result).toEqual({ status: "sent" });
		expect(postMessage).toHaveBeenCalledWith(
			"https://hooks.slack.test/seo",
			expect.objectContaining({ text: expect.stringContaining("신규 경고 1건") }),
		);
	});

	it("SEO 검사가 실패하고 보고서가 없으면 실행 실패를 알린다", async () => {
		const postMessage = vi.fn().mockResolvedValue(undefined);

		const result = await notifySeoSlack({
			readReport: vi.fn().mockRejectedValue(new Error("missing")),
			seoCheckOutcome: "failure",
			postMessage,
			webhookUrl: "https://hooks.slack.test/seo",
		});

		expect(result).toEqual({ status: "sent" });
		expect(postMessage).toHaveBeenCalledWith(
			"https://hooks.slack.test/seo",
			expect.objectContaining({ text: expect.stringContaining("보고서를 생성하기 전에 실패") }),
		);
	});

	it("웹훅이 없으면 알림 대상이어도 실패시키지 않는다", async () => {
		const report = createReport({
			errors: [{ severity: "error", code: "NOINDEX" }],
		});

		const result = await notifySeoSlack({
			readReport: vi.fn().mockResolvedValue(JSON.stringify(report)),
			webhookUrl: "",
		});

		expect(result).toEqual({ status: "skipped", reason: "missing_webhook" });
	});
});
