// @vitest-environment jsdom
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HighlightEditToolbar } from "./HighlightEditToolbar";

vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

const makeState = (id: number) => ({
	row: { id, color: "yellow", note: "same note" } as HighlightRow,
	x: 10,
	y: 10,
	isSaving: false,
	message: "",
});

afterEach(() => {
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

describe("하이라이트 메모 편집 UI", () => {
	it("다른 하이라이트로 전환하면 열린 메모 입력을 닫고 새 행 상태로 초기화한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		const onHighlightEdit = vi.fn();
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					onHighlightEdit,
				}),
			);
		});
		await act(async () => {
			container
				.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')
				?.click();
		});
		expect(container.querySelector("textarea")).not.toBeNull();
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(2),
					onHighlightEdit,
				}),
			);
		});
		expect(container.querySelector("textarea")).toBeNull();
		await act(async () => {
			root.unmount();
		});
	});
	it("한글 입력 조합 중 Enter는 저장하지 않고 조합 종료 후 Enter만 저장한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		const onHighlightEdit = vi.fn();
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					initialNoteOpen: true,
					onHighlightEdit,
				}),
			);
		});
		const textarea = container.querySelector("textarea");
		await act(async () => {
			textarea?.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Enter",
					isComposing: true,
					bubbles: true,
				}),
			);
		});
		expect(onHighlightEdit).not.toHaveBeenCalled();
		await act(async () => {
			textarea?.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});
		expect(onHighlightEdit).toHaveBeenCalledWith({
			action: "note",
			note: "same note",
		});
		await act(async () => {
			root.unmount();
		});
	});
});
