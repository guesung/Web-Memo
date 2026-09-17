// @vitest-environment jsdom

import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightQuote } from "./HighlightQuote";

const mocks = vi.hoisted(() => ({ saveNote: vi.fn() }));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("../_hooks", () => ({
	useHighlightNoteMutation: () => ({ mutate: mocks.saveNote }),
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});
afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});
const renderQuote = async (note: string | null) => {
	await act(async () =>
		root.render(
			createElement(HighlightQuote, {
				lng: "ko",
				highlight: {
					id: 7,
					exact_text: "저장한 원문",
					color: "pink",
					note,
				} as HighlightRow,
			}),
		),
	);
};
describe("하이라이트 문장과 기존 메모", () => {
	it.each([null, "", "  "])(
		"빈 메모 %s에는 추가 버튼을 표시하지 않는다",
		async (note) => {
			await renderQuote(note);
			expect(container.querySelector("button")).toBeNull();
			expect(container.querySelector("mark")?.textContent).toBe("저장한 원문");
			expect(container.querySelector("mark")?.style.backgroundColor).toBe(
				"rgba(244, 114, 182, 0.4)",
			);
		},
	);
	it("기존 메모는 클릭하여 수정하고 저장할 수 있다", async () => {
		await renderQuote("기존 메모");
		const button = container.querySelector("button");
		expect(button?.textContent).toBe("기존 메모");
		await act(async () => button?.click());
		const textarea = container.querySelector("textarea");
		expect(textarea?.value).toBe("기존 메모");
		expect(document.activeElement).toBe(textarea);
		await act(async () => {
			const setter = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				"value",
			)?.set;
			setter?.call(textarea, "수정한 메모");
			textarea?.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await act(async () =>
			textarea?.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
		);
		expect(mocks.saveNote).toHaveBeenCalledWith(
			{ id: 7, note: "수정한 메모" },
			expect.objectContaining({
				onError: expect.any(Function),
				onSuccess: expect.any(Function),
			}),
		);
	});
});

it("기존 메모를 비운 저장이 실패하면 원래 메모와 편집 경로를 복구한다", async () => {
	await renderQuote("기존 메모");
	await act(async () => container.querySelector("button")?.click());
	const textarea = container.querySelector("textarea");
	await act(async () => {
		Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			"value",
		)?.set?.call(textarea, "");
		textarea?.dispatchEvent(new Event("input", { bubbles: true }));
	});
	await act(async () =>
		textarea?.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
	);
	expect(mocks.saveNote.mock.calls[0][0]).toEqual({ id: 7, note: "" });
	await act(async () =>
		mocks.saveNote.mock.calls[0][1].onError(new Error("실패")),
	);
	expect(container.querySelector('[role="alert"]')?.textContent).toBe(
		"memos.saveStatus.error",
	);
	expect(container.querySelector("button")?.textContent).toBe("기존 메모");
	await act(async () => container.querySelector("button")?.click());
	expect(container.querySelector("textarea")?.value).toBe("기존 메모");
});
