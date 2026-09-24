// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	holdScrollPosition,
	restoreHeldScrollPosition,
} from "./scrollPositionHold";

describe("스크롤 위치 붙잡기", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		window.scrollTo = vi.fn();
		Object.defineProperty(window, "scrollY", { value: 300, writable: true });
	});
	afterEach(() => {
		vi.runAllTimers();
		vi.useRealTimers();
	});

	it("egjs가 스크롤을 옮기면 붙잡은 위치로 되돌린다", () => {
		holdScrollPosition();
		window.scrollY = 809;
		restoreHeldScrollPosition();
		expect(window.scrollTo).toHaveBeenCalledWith(0, 300);
	});
	it("사용자가 직접 스크롤하면 놓는다", () => {
		holdScrollPosition();
		window.dispatchEvent(new Event("wheel"));
		window.scrollY = 809;
		restoreHeldScrollPosition();
		expect(window.scrollTo).not.toHaveBeenCalled();
	});
	it("3초가 지나면 놓는다", () => {
		holdScrollPosition();
		vi.advanceTimersByTime(3000);
		window.scrollY = 809;
		restoreHeldScrollPosition();
		expect(window.scrollTo).not.toHaveBeenCalled();
	});
});
