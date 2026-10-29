// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { showHighlightFocus } from "./showHighlightFocus";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

it.each([false, true])(
	"선택한 텍스트 범위만 표시하고 reduced motion=%s에서 1초 뒤 제거한다",
	(reducedMotion) => {
		vi.useFakeTimers();
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
			frames.push(callback);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		const paragraph = document.createElement("p");
		paragraph.textContent = "before selected after";
		document.body.append(paragraph);
		const range = document.createRange();
		range.setStart(paragraph.firstChild as Text, 7);
		range.setEnd(paragraph.firstChild as Text, 15);
		Object.defineProperties(range, {
			getBoundingClientRect: { value: () => ({ top: 40 }) },
			getClientRects: {
				value: () => [
					{ left: 20, top: 40, width: 80, height: 18 },
					{ left: 20, top: 58, width: 60, height: 18 },
				],
			},
		});
		const stop = showHighlightFocus(range, reducedMotion);
		for (let index = 0; index < 3; index++) frames[index](index * 16);
		const host = document.querySelector<HTMLElement>(
			"[data-web-memo-highlight-focus]",
		);
		expect(host?.getAttribute("aria-hidden")).toBe("true");
		expect(host?.style.pointerEvents).toBe("none");
		expect(paragraph.textContent).toBe("before selected after");
		expect(
			Array.from(host?.shadowRoot?.children ?? []).map((node) => [
				(node as HTMLElement).style.left,
				(node as HTMLElement).style.top,
				(node as HTMLElement).style.width,
			]),
		).toEqual([
			["20px", "40px", "80px"],
			["20px", "58px", "60px"],
		]);
		vi.advanceTimersByTime(750);
		expect(host?.style.opacity).toBe(reducedMotion ? "1" : "0");
		vi.advanceTimersByTime(250);
		expect(host?.isConnected).toBe(false);
		stop();
	},
);

it("새 이동이 이전 표시와 예약 프레임을 취소한다", () => {
	const cancelFrame = vi.fn();
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn(() => 1),
	);
	vi.stubGlobal("cancelAnimationFrame", cancelFrame);
	const range = document.createRange();
	const stop = showHighlightFocus(range, false);
	stop();
	expect(cancelFrame).toHaveBeenCalledWith(1);
	expect(document.querySelector("[data-web-memo-highlight-focus]")).toBeNull();
});
