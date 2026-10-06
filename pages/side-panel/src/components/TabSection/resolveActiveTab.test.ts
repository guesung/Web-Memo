import { describe, expect, it } from "vitest";
import { resolveActiveTab } from "./resolveActiveTab";

describe("resolveActiveTab", () => {
	it("둘 다 켜져 있으면 고른 탭을 그대로 쓴다", () => {
		const both = { isSummaryEnabled: true, isChatEnabled: true };

		expect(resolveActiveTab({ selectedTab: "summary", ...both })).toBe(
			"summary",
		);
		expect(resolveActiveTab({ selectedTab: "chat", ...both })).toBe("chat");
	});

	it("요약만 켜져 있으면 채팅을 골랐어도 요약을 보여 준다", () => {
		expect(
			resolveActiveTab({
				selectedTab: "chat",
				isSummaryEnabled: true,
				isChatEnabled: false,
			}),
		).toBe("summary");
	});

	it("채팅만 켜져 있으면 기본 선택인 요약 대신 채팅을 보여 준다", () => {
		expect(
			resolveActiveTab({
				selectedTab: "summary",
				isSummaryEnabled: false,
				isChatEnabled: true,
			}),
		).toBe("chat");
	});
});
