import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configurePanelBehavior } from "./configurePanelBehavior";

const setPanelBehavior = vi.fn();

beforeEach(() => {
	setPanelBehavior.mockReset().mockResolvedValue(undefined);
	vi.stubGlobal("chrome", { sidePanel: { setPanelBehavior } });
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("사이드 패널 동작 설정", () => {
	it("액션 클릭 시 패널이 열리도록 설정한다", async () => {
		await configurePanelBehavior();

		expect(setPanelBehavior).toHaveBeenCalledWith({
			openPanelOnActionClick: true,
		});
	});

	it("sidePanel API가 없어도 오류를 전파하지 않는다", async () => {
		vi.stubGlobal("chrome", {});

		await expect(configurePanelBehavior()).resolves.toBeUndefined();
	});

	it("설정 Promise가 거부되어도 오류를 전파하지 않는다", async () => {
		setPanelBehavior.mockRejectedValue(new Error("Chrome failed"));

		await expect(configurePanelBehavior()).resolves.toBeUndefined();
		expect(console.warn).toHaveBeenCalledWith(
			"[sidePanel] 패널 동작을 설정하지 못했습니다.",
			expect.any(Error),
		);
	});
});
