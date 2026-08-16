// @vitest-environment jsdom
import type {
	HighlightItem,
	HighlightRenderer,
} from "@web-memo/shared/modules/highlight";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startHighlightRestore } from "./restoreHighlights";

function createFakeRenderer(): HighlightRenderer & { added: number[] } {
	const added: number[] = [];

	return {
		added,
		add(id) {
			added.push(id);
		},
		remove() {},
		setColor() {},
		hitTest() {
			return null;
		},
		clear() {},
	};
}

function createItem(id: number, exact: string): HighlightItem {
	return {
		id,
		anchor: { exact, prefix: "", suffix: "", textPositionStart: 0 },
		color: "yellow",
	};
}

/** MutationObserver 콜백과 debounce 타이머가 흐르도록 기다린다 */
async function flush(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("startHighlightRestore", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("이미 있는 문장은 즉시 렌더한다", () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({ items: [createItem(1, "브라보")], renderer });

		expect(renderer.added).toEqual([1]);
	});

	it("나중에 들어온 문장도 렌더한다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});
		expect(renderer.added).toEqual([]);

		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("이미 렌더한 앵커를 다시 렌더하지 않는다", async () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보"), createItem(2, "없는문장")],
			renderer,
			debounceMs: 10,
		});
		expect(renderer.added).toEqual([1]);

		document.body.appendChild(document.createElement("div"));
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("모두 찾으면 이후 DOM 변경에 반응하지 않는다", async () => {
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});

		document.body.innerHTML = "<p>알파 브라보 찰리 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([1]);
	});

	it("타임아웃 뒤에는 늦게 들어온 문장을 렌더하지 않는다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
			timeoutMs: 30,
		});

		await flush(60);
		document.body.innerHTML = "<p>알파 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([]);
	});

	it("정리 함수를 부르면 이후 DOM 변경을 무시한다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		const stop = startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});
		stop();

		document.body.innerHTML = "<p>알파 브라보</p>";
		await flush(60);

		expect(renderer.added).toEqual([]);
	});

	it("항목이 없으면 옵저버를 만들지 않는다", () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();
		const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");

		startHighlightRestore({ items: [], renderer });

		expect(observeSpy).not.toHaveBeenCalled();
	});

	it("SPA 이동으로 URL이 바뀌면 더 이상 렌더하지 않는다", async () => {
		document.body.innerHTML = "<p>알파</p>";
		const renderer = createFakeRenderer();

		startHighlightRestore({
			items: [createItem(1, "브라보")],
			renderer,
			debounceMs: 10,
		});
		expect(renderer.added).toEqual([]);

		window.history.pushState({}, "", "/other");
		document.body.innerHTML = "<p>알파 브라보 찰리</p>";
		await flush(60);

		expect(renderer.added).toEqual([]);
	});
});
