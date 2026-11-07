import { describe, expect, it, vi } from "vitest";
import { resolveEmailReturn } from ".";

vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));

describe("resolveEmailReturn", () => {
	it("주간 메일 캠페인 링크에서 캠페인과 content를 읽는다", () => {
		expect(
			resolveEmailReturn(
				new URLSearchParams(
					"utm_source=weekly_report&utm_campaign=weekly_memo_resurface&utm_content=memo_1",
				),
			),
		).toEqual({ campaign: "weekly_memo_resurface", content: "memo_1" });
	});

	it("content가 없으면 none으로 둔다", () => {
		expect(
			resolveEmailReturn(
				new URLSearchParams(
					"utm_source=weekly_report&utm_campaign=weekly_memo_report",
				),
			),
		).toEqual({ campaign: "weekly_memo_report", content: "none" });
	});

	it("다른 소스나 테스트 캠페인은 집계하지 않는다", () => {
		for (const query of [
			"",
			"utm_source=newsletter&utm_campaign=weekly_memo_report",
			"utm_source=weekly_report&utm_campaign=weekly_memo_resurface_test",
			"utm_source=weekly_report",
		]) {
			expect(resolveEmailReturn(new URLSearchParams(query))).toBeNull();
		}
	});
});
