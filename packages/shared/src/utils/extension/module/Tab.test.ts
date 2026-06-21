import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Tab } from "./Tab";

describe("Tab.get", () => {
	const queryMock = vi.fn();

	beforeEach(() => {
		queryMock.mockReset();
		vi.stubGlobal("chrome", {
			tabs: { query: queryMock },
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("현재 창(사이드 패널이 속한 창)의 활성 탭을 조회한다.", async () => {
		// 사이드 패널은 각 창마다 별도 인스턴스로 동작하므로, 마지막으로 포커스된 창이 아니라
		// 자신이 속한 창(currentWindow)의 활성 탭을 가져와야 한다.
		const ownWindowTab = { id: 1, url: "https://own-window.example" };
		queryMock.mockResolvedValue([ownWindowTab]);

		const tab = await Tab.get();

		expect(queryMock).toHaveBeenCalledWith({
			active: true,
			currentWindow: true,
		});
		expect(tab).toBe(ownWindowTab);
	});
});
