import { describe, expect, it } from "vitest";
import { isAcceptShortcut } from "./isAcceptShortcut";

const BASE_EVENT = {
	key: "Enter",
	keyCode: 13,
	metaKey: false,
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	repeat: false,
	isComposing: false,
	defaultPrevented: false,
};

describe("isAcceptShortcut", () => {
	it("macOS는 Cmd+Enter만 수락한다", () => {
		expect(isAcceptShortcut({ ...BASE_EVENT, metaKey: true }, true)).toBe(true);
		expect(isAcceptShortcut({ ...BASE_EVENT, ctrlKey: true }, true)).toBe(
			false,
		);
		expect(
			isAcceptShortcut({ ...BASE_EVENT, metaKey: true, ctrlKey: true }, true),
		).toBe(false);
	});

	it("그 외 OS는 Ctrl+Enter만 수락한다", () => {
		expect(isAcceptShortcut({ ...BASE_EVENT, ctrlKey: true }, false)).toBe(
			true,
		);
		expect(isAcceptShortcut({ ...BASE_EVENT, metaKey: true }, false)).toBe(
			false,
		);
		expect(
			isAcceptShortcut({ ...BASE_EVENT, metaKey: true, ctrlKey: true }, false),
		).toBe(false);
	});

	it("Enter 단독이나 다른 키는 수락하지 않는다", () => {
		expect(isAcceptShortcut(BASE_EVENT, true)).toBe(false);
		expect(
			isAcceptShortcut({ ...BASE_EVENT, key: "a", metaKey: true }, true),
		).toBe(false);
	});

	it.each([
		["IME 조합 중", { isComposing: true }],
		["keyCode 229", { keyCode: 229 }],
		["이미 처리된 이벤트", { defaultPrevented: true }],
		["키 반복", { repeat: true }],
		["Alt 동반", { altKey: true }],
		["Shift 동반", { shiftKey: true }],
	])("%s이면 수락하지 않는다", (_name, override) => {
		expect(
			isAcceptShortcut({ ...BASE_EVENT, metaKey: true, ...override }, true),
		).toBe(false);
	});
});
