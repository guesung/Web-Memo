// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	captureMemoCardOpen,
	cardMotionFrames,
	clearMemoCardOpen,
	peekMemoCardOpen,
} from "./memoCardMotion";

describe("메모 카드 상세 전환 위치", () => {
	it("펼친 카드가 상세보다 길어도 상세 높이에 맞는 보이는 구간에서 시작한다", () => {
		const dialog = { left: 220, top: 100, width: 720, height: 600 } as DOMRect;
		const card = { left: 100, top: -180, width: 300, height: 1200 };
		const frames = cardMotionFrames(dialog, card);

		expect(frames).toBeDefined();
		expect(frames?.[0].clipPath).not.toContain("-");
		expect(frames?.[0].translate).not.toBe("0px 0px");
	});

	it("화면 위로 벗어난 카드에서는 보이는 구간만 출발 위치로 잡는다", () => {
		const card = document.createElement("div");
		card.getBoundingClientRect = () =>
			({ left: 100, top: -180, width: 300, height: 1200 }) as DOMRect;
		captureMemoCardOpen(42, card);

		expect(peekMemoCardOpen(42)).toEqual({
			left: 100,
			top: 0,
			width: 300,
			height: window.innerHeight,
		});
		clearMemoCardOpen(42);
	});
});
