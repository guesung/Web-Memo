// @vitest-environment jsdom
import type { TCreateHighlightResponse } from "@web-memo/shared/modules/extension-bridge";
import { toHighlightItem } from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createHighlightController,
	type IFHighlightSelectionState,
} from "./createHighlightController";
import { startHighlightRestore } from "./restoreHighlights";

const ROW: HighlightRow = {
	id: 1,
	exact_text: "선택한 문장",
	prefix_text: "앞 ",
	suffix_text: " 뒤",
	text_position_start: 2,
	url: "http://localhost:3000/",
	page_key: "http://localhost:3000/",
	title: "",
	favIconUrl: "",
	color: "yellow",
	note: null,
	user_id: "user",
	created_at: "",
	updated_at: "",
};
const createRenderer = () => ({
	add: vi.fn(),
	remove: vi.fn(),
	setColor: vi.fn(),
	hitTest: vi.fn(() => null),
	clear: vi.fn(),
});
let stop: (() => void) | undefined;
const selectText = () => {
	const range = document.createRange();
	const text = document.querySelector("p")?.firstChild as Text;
	range.setStart(text, 2);
	range.setEnd(text, 8);
	document.getSelection()?.removeAllRanges();
	document.getSelection()?.addRange(range);
	document.dispatchEvent(new MouseEvent("mouseup"));
};

beforeEach(() => {
	vi.useFakeTimers();
	document.body.innerHTML = "<p>앞 선택한 문장 뒤</p>";
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => ({ left: 20, bottom: 40 }),
	});
});
afterEach(() => {
	stop?.();
	window.history.replaceState(null, "", "/");
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("확장 하이라이트 생성", () => {
	it("기존 행이 없어도 첫 선택을 저장하고 선택이 해제되어도 보존한 앵커로 그린다", async () => {
		const renderer = createRenderer();
		const requestCreate = vi.fn(
			async (_payload: unknown) =>
				({ success: true, highlight: ROW }) as TCreateHighlightResponse,
		);
		const controller = createHighlightController({
			renderer,
			requestCreate,
			onSelectionChange: vi.fn(),
		});
		stop = controller.stop;
		selectText();
		document.getSelection()?.removeAllRanges();
		await controller.save();
		expect(requestCreate).toHaveBeenCalledOnce();
		expect(requestCreate.mock.calls[0]?.[0]).toMatchObject({
			anchor: { exact: "선택한 문장", textPositionStart: 2 },
		});
		expect(renderer.add).toHaveBeenCalledWith(1, expect.any(Range), "yellow");
	});
	it("선택한 색상으로 생성 요청하고 해당 색으로 즉시 그린다", async () => {
		const renderer = createRenderer();
		const requestCreate = vi.fn(
			async () =>
				({
					success: true,
					highlight: { ...ROW, color: "green" },
				}) as TCreateHighlightResponse,
		);
		const onSaveSuccess = vi.fn();
		const controller = createHighlightController({
			renderer,
			requestCreate,
			onSelectionChange: vi.fn(),
			onSaveSuccess,
		});
		stop = controller.stop;
		selectText();
		const row = await controller.save("green");
		expect(requestCreate).toHaveBeenCalledWith(
			expect.objectContaining({ color: "green" }),
		);
		expect(renderer.add).toHaveBeenCalledWith(1, expect.any(Range), "green");
		expect(onSaveSuccess).toHaveBeenCalledWith("green");
		expect(row).toMatchObject({ color: "green" });
	});
	it("저장 중 연속 클릭은 하나의 요청만 보내고 저장 전에는 표시하지 않는다", async () => {
		let resolveRequest: (response: TCreateHighlightResponse) => void = () => {};
		const requestCreate = vi.fn(
			() =>
				new Promise<TCreateHighlightResponse>((resolve) => {
					resolveRequest = resolve;
				}),
		);
		const renderer = createRenderer();
		const controller = createHighlightController({
			renderer,
			requestCreate,
			onSelectionChange: vi.fn(),
		});
		stop = controller.stop;
		selectText();
		const saving = controller.save();
		await controller.save();
		expect(requestCreate).toHaveBeenCalledOnce();
		expect(renderer.add).not.toHaveBeenCalled();
		resolveRequest({ success: true, highlight: ROW });
		await saving;
		selectText();
		await controller.save();
		expect(requestCreate).toHaveBeenCalledOnce();
	});
	it.each(["save_failed", "unauthenticated"] as const)(
		"%s이면 안내하고 렌더하지 않으며 다시 시도할 수 있다",
		async (error) => {
			const renderer = createRenderer();
			let state: IFHighlightSelectionState | null = null;
			const requestCreate = vi.fn(
				async () => ({ success: false, error }) as TCreateHighlightResponse,
			);
			const controller = createHighlightController({
				renderer,
				requestCreate,
				onSelectionChange: (next) => {
					state = next;
				},
			});
			stop = controller.stop;
			selectText();
			await controller.save();
			expect(state).toMatchObject({
				isSaving: false,
				message:
					error === "unauthenticated"
						? "highlight_login_required"
						: "highlight_save_failed",
			});
			expect(renderer.add).not.toHaveBeenCalled();
			await controller.save();
			expect(requestCreate).toHaveBeenCalledTimes(2);
		},
	);
	it("저장 중 URL이 바뀌면 이전 페이지의 결과를 그리지 않는다", async () => {
		const renderer = createRenderer();
		const controller = createHighlightController({
			renderer,
			requestCreate: async () => {
				window.history.pushState(null, "", "/another");

				return { success: true, highlight: ROW };
			},
			onSelectionChange: vi.fn(),
		});
		stop = controller.stop;
		selectText();
		await controller.save();
		expect(renderer.add).not.toHaveBeenCalled();
		expect(renderer.clear).toHaveBeenCalledOnce();
	});
	it("새로고침 후 저장 행을 복원하고 같은 선택의 재저장을 차단한다", async () => {
		const renderer = createRenderer();
		const requestCreate = vi.fn();
		startHighlightRestore({ renderer, items: [toHighlightItem(ROW)] });
		const controller = createHighlightController({
			renderer,
			requestCreate,
			onSelectionChange: vi.fn(),
		});
		stop = controller.stop;
		controller.registerRows([ROW]);
		selectText();
		await controller.save();
		expect(renderer.add).toHaveBeenCalledWith(1, expect.any(Range), "yellow");
		expect(requestCreate).not.toHaveBeenCalled();
	});
	it("선택 게이트가 닫혀 있으면 툴바 상태를 만들지 않고 저장하지 않는다", async () => {
		let state: IFHighlightSelectionState | null = null;
		const requestCreate = vi.fn();
		const controller = createHighlightController({
			renderer: createRenderer(),
			requestCreate,
			onSelectionChange: (next) => {
				state = next;
			},
			isSelectionEnabled: () => false,
		});
		stop = controller.stop;
		selectText();
		await controller.save();
		expect(state).toBeNull();
		expect(requestCreate).not.toHaveBeenCalled();
	});
	it("게이트가 열림에서 닫힘으로 바뀌면 열린 툴바를 닫고 다음 선택도 무시한다", async () => {
		let isSelectionEnabled = true;
		let state: IFHighlightSelectionState | null = null;
		const controller = createHighlightController({
			renderer: createRenderer(),
			requestCreate: vi.fn(),
			onSelectionChange: (next) => {
				state = next;
			},
			isSelectionEnabled: () => isSelectionEnabled,
		});
		stop = controller.stop;
		selectText();
		expect(state).toMatchObject({ canSave: true });
		isSelectionEnabled = false;
		controller.dismissSelection();
		expect(state).toBeNull();
		selectText();
		expect(state).toBeNull();
	});
	it("저장에 성공하면 onSaveSuccess를 한 번 부르고 실패하면 부르지 않는다", async () => {
		const onSaveSuccess = vi.fn();
		const requestCreate = vi
			.fn()
			.mockResolvedValueOnce({ success: false, error: "save_failed" })
			.mockResolvedValueOnce({ success: true, highlight: ROW });
		const controller = createHighlightController({
			renderer: createRenderer(),
			requestCreate,
			onSelectionChange: vi.fn(),
			onSaveSuccess,
		});
		stop = controller.stop;
		selectText();
		await controller.save();
		expect(onSaveSuccess).not.toHaveBeenCalled();
		await controller.save();
		expect(onSaveSuccess).toHaveBeenCalledOnce();
	});
	it("편집 가능 영역의 선택은 저장하지 않는다", async () => {
		document.querySelector("p")?.setAttribute("contenteditable", "");
		const requestCreate = vi.fn();
		const controller = createHighlightController({
			renderer: createRenderer(),
			requestCreate,
			onSelectionChange: vi.fn(),
		});
		stop = controller.stop;
		selectText();
		await controller.save();
		expect(requestCreate).not.toHaveBeenCalled();
	});
	it("hash 이동은 기존 표시와 중복 판정을 유지한다", async () => {
		const renderer = createRenderer();
		const requestCreate = vi.fn();
		const onPageChange = vi.fn();
		const controller = createHighlightController({
			renderer,
			requestCreate,
			onSelectionChange: vi.fn(),
			onPageChange,
		});
		stop = controller.stop;
		controller.registerRows([ROW]);
		window.history.pushState(null, "", "/#section");
		await vi.advanceTimersByTimeAsync(500);
		selectText();
		await controller.save();
		expect(renderer.clear).not.toHaveBeenCalled();
		expect(onPageChange).not.toHaveBeenCalled();
		expect(requestCreate).not.toHaveBeenCalled();
	});
	it("실제 SPA 페이지 이동은 렌더러를 비우고 재조회를 요청한다", async () => {
		const renderer = createRenderer();
		const onPageChange = vi.fn();
		const controller = createHighlightController({
			renderer,
			requestCreate: vi.fn(),
			onSelectionChange: vi.fn(),
			onPageChange,
		});
		stop = controller.stop;
		window.history.pushState(null, "", "/new-page");
		await vi.advanceTimersByTimeAsync(500);
		expect(renderer.clear).toHaveBeenCalledOnce();
		expect(onPageChange).toHaveBeenCalledOnce();
	});
});

it("삭제된 행의 중복 키를 해제해 같은 문장을 다시 저장할 수 있다", async () => {
	const requestCreate = vi.fn(
		async () => ({ success: true, highlight: ROW }) as TCreateHighlightResponse,
	);
	const controller = createHighlightController({
		renderer: createRenderer(),
		requestCreate,
		onSelectionChange: vi.fn(),
	});
	stop = controller.stop;
	controller.registerRows([ROW]);
	controller.removeRow(ROW.id);
	expect(controller.getRow(ROW.id)).toBeUndefined();
	expect(controller.registerRows([ROW])).toEqual([]);
	expect(controller.getRow(ROW.id)).toBeUndefined();
	selectText();
	await controller.save();
	expect(requestCreate).toHaveBeenCalledOnce();
});
