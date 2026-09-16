// @vitest-environment jsdom
import type { HighlightRow } from "@web-memo/shared/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHighlightEditor } from "./createHighlightEditor";

const ROW = {
	id: 1,
	url: "http://localhost:3000/",
	user_id: "owner",
	color: "yellow",
	exact_text: "text",
	text_position_start: 0,
} as HighlightRow;
const setup = () => {
	const options = {
		renderer: {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => 1),
			clear: vi.fn(),
		},
		notesById: new Map([[1, "note"]]),
		getRow: vi.fn(() => ROW),
		updateRow: vi.fn(),
		removeRow: vi.fn(),
		onChange: vi.fn(),
		requestEdit: vi.fn().mockResolvedValue({
			success: true,
			highlight: { ...ROW, color: "pink" },
		}),
	};
	const editor = createHighlightEditor(options);
	document.dispatchEvent(new MouseEvent("click", { clientX: 40, clientY: 40 }));

	return { options, editor };
};
beforeEach(() => {
	vi.useFakeTimers();
	document.getSelection()?.removeAllRanges();
});
afterEach(() => {
	vi.useRealTimers();
	window.history.replaceState(null, "", "/");
});

describe("하이라이트 편집 상태", () => {
	it("성공한 색상만 렌더러와 행에 반영한다", async () => {
		const { editor, options } = setup();
		await editor.edit({ action: "color", color: "pink" });
		expect(options.renderer.setColor).toHaveBeenCalledWith(1, "pink");
		expect(options.updateRow).toHaveBeenCalledWith(
			expect.objectContaining({ color: "pink" }),
		);
		editor.stop();
	});
	it("삭제 성공 후 렌더링·노트·중복 판정 행을 제거한다", async () => {
		const { editor, options } = setup();
		await editor.edit({ action: "delete" });
		expect(options.renderer.remove).toHaveBeenCalledWith(1);
		expect(options.removeRow).toHaveBeenCalledWith(1);
		expect(options.notesById.has(1)).toBe(false);
		editor.stop();
	});
	it("실패 시 기존 하이라이트를 유지하고 재시도 안내를 표시한다", async () => {
		const { editor, options } = setup();
		options.requestEdit.mockResolvedValue({
			success: false,
			error: "save_failed",
		});
		await editor.edit({ action: "delete" });
		expect(options.renderer.remove).not.toHaveBeenCalled();
		expect(options.onChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				message: "highlight_save_failed",
				isSaving: false,
			}),
		);
		editor.stop();
	});
	it("중복 클릭을 막고 페이지가 변경된 뒤의 응답을 버린다", async () => {
		const { editor, options } = setup();
		let resolveRequest: (response: unknown) => void = () => {};
		options.requestEdit.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRequest = resolve;
				}),
		);
		const pending = editor.edit({ action: "delete" });
		await editor.edit({ action: "delete" });
		expect(options.requestEdit).toHaveBeenCalledTimes(1);
		window.history.pushState(null, "", "/next");
		resolveRequest({ success: true, highlight: ROW });
		await pending;
		expect(options.renderer.remove).not.toHaveBeenCalled();
		editor.stop();
	});
	it("Escape로 메뉴를 닫는다", () => {
		const { editor, options } = setup();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(options.onChange).toHaveBeenLastCalledWith(null);
		editor.stop();
	});
});
