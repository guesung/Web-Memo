import { describe, expect, it } from "vitest";
import { resolveActiveTab } from "./resolveActiveTab";

describe("resolveActiveTab", () => {
	it("요약이 접히면 채팅으로 돌아간다", () => {
		expect(
			resolveActiveTab({
				selectedTab: "summary",
				isSummaryOpen: false,
				isChatEnabled: true,
			}),
		).toBe("chat");
	});

	it("요약만 열려 있으면 요약을 표시한다", () => {
		expect(
			resolveActiveTab({
				selectedTab: "chat",
				isSummaryOpen: true,
				isChatEnabled: false,
			}),
		).toBe("summary");
	});

	it("둘 다 열려 있으면 선택한 탭을 표시한다", () => {
		const available = { isSummaryOpen: true, isChatEnabled: true };
		expect(resolveActiveTab({ selectedTab: "chat", ...available })).toBe(
			"chat",
		);
		expect(resolveActiveTab({ selectedTab: "summary", ...available })).toBe(
			"summary",
		);
	});

	it("둘 다 닫혀 있으면 AI 영역이 없다", () => {
		expect(
			resolveActiveTab({
				selectedTab: "chat",
				isSummaryOpen: false,
				isChatEnabled: false,
			}),
		).toBeNull();
	});
});
