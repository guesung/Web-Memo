import { describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: vi.fn(), set: vi.fn() },
	STORAGE_KEYS: { tabHeight: "tabHeight" },
}));

import { clampPanelHeight } from "./useResizablePanel";

describe("clampPanelHeight", () => {
	it("요약 영역은 최대 60%이며 메모에 128px을 남긴다", () => {
		expect(clampPanelHeight(80, 600, true)).toBe(60);
		expect(clampPanelHeight(60, 300, true)).toBeCloseTo((172 / 300) * 100);
		expect(clampPanelHeight(40, 120, true)).toBe(0);
	});

	it("채팅은 기존 최대 80%를 유지한다", () => {
		expect(clampPanelHeight(90, 300, false)).toBe(80);
		expect(clampPanelHeight(-5, 300, false)).toBe(0);
	});
});
