// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import useMemoListKeyboardNavigation from "./useMemoListKeyboardNavigation";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const Harness = () => {
	useMemoListKeyboardNavigation();
	return createElement(
		"div",
		null,
		createElement("input", { id: "search" }),
		[1, 2, 3].map((id) =>
			createElement("div", {
				key: id,
				id: String(id),
				className: "memo-item",
				role: "button",
				tabIndex: 0,
			}),
		),
	);
};

const press = (code: string, init: KeyboardEventInit = {}) => {
	const target = (document.activeElement ?? document.body) as HTMLElement;
	const event = new KeyboardEvent("keydown", {
		code,
		key: code.replace("Key", "").toLowerCase(),
		bubbles: true,
		cancelable: true,
		...init,
	});
	act(() => {
		target.dispatchEvent(event);
	});
	return event;
};

const focusedId = () => (document.activeElement as HTMLElement | null)?.id;

describe("useMemoListKeyboardNavigation", () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		Element.prototype.scrollIntoView = () => {};
		container = document.createElement("div");
		document.body.append(container);
		root = createRoot(container);
		act(() => root.render(createElement(Harness)));
	});

	afterEach(() => {
		act(() => root.unmount());
		container.remove();
		for (const dialog of document.querySelectorAll('[role="dialog"]')) {
			dialog.remove();
		}
	});

	it("고른 카드가 없으면 J로 첫 카드부터 고른다", () => {
		const event = press("KeyJ");

		expect(focusedId()).toBe("1");
		expect(event.defaultPrevented).toBe(true);
	});

	it("J는 다음 카드로, K는 이전 카드로 옮기고 끝에서는 멈춘다", () => {
		press("KeyJ");
		press("KeyJ");
		press("KeyJ");
		press("KeyJ");
		expect(focusedId()).toBe("3");

		press("KeyK");
		expect(focusedId()).toBe("2");
		press("KeyK");
		press("KeyK");
		expect(focusedId()).toBe("1");
	});

	it("한글 자판(key가 ㅓ)이어도 code로 움직인다", () => {
		press("KeyJ", { key: "ㅓ" });

		expect(focusedId()).toBe("1");
	});

	it("입력칸에 쓰는 중에는 반응하지 않는다", () => {
		document.getElementById("search")?.focus();
		const event = press("KeyJ");

		expect(focusedId()).toBe("search");
		expect(event.defaultPrevented).toBe(false);
	});

	it("수정키를 함께 누르면 반응하지 않는다", () => {
		press("KeyJ", { metaKey: true });

		expect(focusedId()).not.toBe("1");
	});

	it("다이얼로그가 떠 있으면 반응하지 않는다", () => {
		const dialog = document.createElement("div");
		dialog.setAttribute("role", "dialog");
		document.body.append(dialog);

		press("KeyJ");

		expect(focusedId()).not.toBe("1");
	});
});
