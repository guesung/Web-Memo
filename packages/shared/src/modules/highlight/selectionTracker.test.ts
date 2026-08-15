// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSelectionTracker,
	isSelectableTarget,
	MAX_SELECTION_LENGTH,
} from "./selectionTracker";

describe("isSelectableTarget", () => {
	it("일반 문단은 선택할 수 있다", () => {
		const p = document.createElement("p");
		p.textContent = "본문";

		expect(isSelectableTarget(p.firstChild)).toBe(true);
	});

	it("input 안은 선택 대상이 아니다", () => {
		const input = document.createElement("input");

		expect(isSelectableTarget(input)).toBe(false);
	});

	it("textarea 안은 선택 대상이 아니다", () => {
		const textarea = document.createElement("textarea");
		textarea.textContent = "내용";

		expect(isSelectableTarget(textarea.firstChild)).toBe(false);
	});

	it("contenteditable 안은 선택 대상이 아니다", () => {
		const editable = document.createElement("div");
		editable.setAttribute("contenteditable", "true");
		const child = document.createElement("span");
		editable.appendChild(child);

		expect(isSelectableTarget(child)).toBe(false);
	});

	it("null은 선택 대상이 아니다", () => {
		expect(isSelectableTarget(null)).toBe(false);
	});
});

/** 테스트용 문단을 문서에 붙인다 */
function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	document.body.appendChild(root);
	return root;
}

/** root 안에서 target 문자열을 찾아 선택하고 selectionchange를 발생시킨다 */
function selectText(root: HTMLElement, target: string): void {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode() as Text | null;

	while (node) {
		const index = node.data.indexOf(target);

		if (index !== -1) {
			const range = document.createRange();
			range.setStart(node, index);
			range.setEnd(node, index + target.length);

			const selection = document.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			document.dispatchEvent(new Event("selectionchange"));
			return;
		}

		node = walker.nextNode() as Text | null;
	}

	throw new Error(`대상 텍스트를 찾지 못했다: ${target}`);
}

/** 선택을 해제하고 selectionchange를 발생시킨다 */
function clearSelection(): void {
	document.getSelection()?.removeAllRanges();
	document.dispatchEvent(new Event("selectionchange"));
}

describe("createSelectionTracker", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = "";
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("유효한 선택은 디바운스 뒤 앵커로 캐싱된다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const tracker = createSelectionTracker();
		tracker.start();

		selectText(root, "라마바");
		vi.runAllTimers();

		expect(tracker.getPendingAnchor()?.exact).toBe("라마바");
		expect(tracker.getRejection()).toBeNull();

		tracker.stop();
	});

	it("너무 짧은 선택은 캐싱하지 않는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const tracker = createSelectionTracker();
		tracker.start();

		selectText(root, "가나");
		vi.runAllTimers();

		expect(tracker.getPendingAnchor()).toBeNull();
		expect(tracker.getRejection()).toBeNull();

		tracker.stop();
	});

	it("너무 긴 선택은 rejection을 남기고 캐싱하지 않는다", () => {
		const longText = "가".repeat(MAX_SELECTION_LENGTH + 1);
		const root = render(`<p>${longText}</p>`);
		const tracker = createSelectionTracker();
		tracker.start();

		selectText(root, longText);
		vi.runAllTimers();

		expect(tracker.getPendingAnchor()).toBeNull();
		expect(tracker.getRejection()).toBe("tooLong");

		tracker.stop();
	});

	it("stop 이후에는 선택이 바뀌어도 캐싱하지 않는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const tracker = createSelectionTracker();
		tracker.start();
		tracker.stop();

		selectText(root, "라마바");
		vi.runAllTimers();

		expect(tracker.getPendingAnchor()).toBeNull();
	});

	it("선택이 해제되면 이전 앵커를 즉시 지운다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const tracker = createSelectionTracker();
		tracker.start();

		selectText(root, "라마바");
		vi.runAllTimers();
		expect(tracker.getPendingAnchor()).not.toBeNull();

		clearSelection();
		expect(tracker.getPendingAnchor()).toBeNull();

		tracker.stop();
	});
});
