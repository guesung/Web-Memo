// @vitest-environment jsdom

import { analytics } from "@web-memo/shared/modules/analytics";
import { ChromeSyncStorage } from "@web-memo/shared/modules/chrome-storage";
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useHighlightSelection } from "./useHighlightSelection";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	create: vi.fn(),
	edit: vi.fn(),
	openPanel: vi.fn(),
	handleScroll: vi.fn(() => vi.fn()),
	isIntroPending: false,
}));
vi.mock("./useHighlightBubbleGate", () => ({
	useHighlightBubbleGate: () => ({
		isBubbleAllowed: true,
		isIntroPending: mocks.isIntroPending,
		bubblePosition: "below",
		positionSettingStatus: "ready",
		setBubblePosition: vi.fn(),
	}),
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: {
		set: vi.fn(),
		get: vi.fn().mockResolvedValue(undefined),
		subscribe: vi.fn(() => vi.fn()),
	},
	STORAGE_KEYS: { highlightIntroSeen: "highlightIntroSeen" },
}));
// 리포터는 @web-memo/env를 끌어와 테스트에서 불러올 수 없다.
vi.mock("../../utils/reportError", () => ({ reportContentUiError: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_HIGHLIGHTS_BY_URL: mocks.query,
			CREATE_HIGHLIGHT: mocks.create,
			EDIT_HIGHLIGHT: mocks.edit,
			OPEN_SIDE_PANEL: mocks.openPanel,
		},
		handle: { SCROLL_TO_HIGHLIGHT: mocks.handleScroll },
	},
}));

afterEach(() => {
	mocks.isIntroPending = false;
	vi.mocked(ChromeSyncStorage.set).mockReset();
	vi.clearAllMocks();
	window.history.replaceState(null, "", "/");
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it.each([
	{
		state: "첫 안내 표시",
		introPending: true,
		menuOpen: false,
		selected: true,
		storage: "success",
		shouldSave: true,
	},
	{
		state: "첫 안내 저장 대기",
		introPending: true,
		menuOpen: false,
		selected: true,
		storage: "pending",
		shouldSave: true,
	},
	{
		state: "첫 안내 저장 실패",
		introPending: true,
		menuOpen: false,
		selected: true,
		storage: "failure",
		shouldSave: true,
	},
	{
		state: "이미 완료한 안내",
		introPending: false,
		menuOpen: false,
		selected: true,
		storage: "success",
		shouldSave: false,
	},
	{
		state: "메뉴에 가려진 안내",
		introPending: true,
		menuOpen: true,
		selected: true,
		storage: "success",
		shouldSave: false,
	},
	{
		state: "선택 없이 숨겨진 안내",
		introPending: true,
		menuOpen: false,
		selected: false,
		storage: "success",
		shouldSave: false,
	},
])(
	"$state 상태의 X는 선택을 즉시 닫고 실제 보인 안내만 완료 저장한다",
	async ({ introPending, menuOpen, selected, storage, shouldSave }) => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mocks.isIntroPending = introPending;
		mocks.query.mockResolvedValue({ highlights: [] });
		let finishSave = () => {};
		if (storage === "pending") {
			vi.mocked(ChromeSyncStorage.set).mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						finishSave = resolve;
					}),
			);
		} else if (storage === "failure") {
			vi.mocked(ChromeSyncStorage.set).mockRejectedValue(
				new Error("storage unavailable"),
			);
		} else {
			vi.mocked(ChromeSyncStorage.set).mockResolvedValue(undefined);
		}
		document.body.innerHTML = "<p>site selection text</p><div id='root'></div>";
		Object.defineProperty(Range.prototype, "getBoundingClientRect", {
			configurable: true,
			value: () => ({ left: 20, top: 20, bottom: 40 }),
		});
		const options = {
			renderer: {
				add: vi.fn(),
				remove: vi.fn(),
				setColor: vi.fn(),
				hitTest: vi.fn(() => null),
				clear: vi.fn(),
			},
			notesById: new Map<number, string>(),
		};
		let hook: ReturnType<typeof useHighlightSelection> | undefined;
		const TestHook = () => {
			hook = useHighlightSelection(options);
			return null;
		};
		const root = createRoot(document.getElementById("root") as HTMLElement);
		document.getSelection()?.removeAllRanges();
		await act(async () => root.render(createElement(TestHook)));
		const text = document.querySelector("p")?.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, "site selection".length);
		if (selected) {
			document.getSelection()?.addRange(range);
			await act(async () => {
				document.dispatchEvent(new MouseEvent("mouseup"));
			});
			expect(hook?.selectionState).not.toBeNull();
		}
		if (menuOpen) {
			await act(async () => hook?.handleBubbleMenuClick());
			expect(hook?.isMenuOpen).toBe(true);
		}
		await act(async () => {
			expect(hook?.handleBubbleCloseClick()).toBeUndefined();
		});
		expect(hook?.selectionState).toBeNull();
		expect(hook?.isMenuOpen).toBe(false);
		expect(hook?.menuError).toBe("");
		if (shouldSave) {
			expect(ChromeSyncStorage.set).toHaveBeenCalledTimes(1);
			expect(ChromeSyncStorage.set).toHaveBeenCalledWith(
				"highlightIntroSeen",
				true,
			);
		} else {
			expect(ChromeSyncStorage.set).not.toHaveBeenCalled();
		}
		expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "highlight_bubble_dismiss",
		});
		if (selected) {
			const preservedRange = document.getSelection()?.getRangeAt(0);
			expect(document.getSelection()?.toString()).toBe("site selection");
			expect(preservedRange?.startContainer).toBe(text);
			expect(preservedRange?.startOffset).toBe(0);
			expect(preservedRange?.endContainer).toBe(text);
			expect(preservedRange?.endOffset).toBe("site selection".length);
			await act(async () => {
				document.dispatchEvent(new MouseEvent("mouseup"));
			});
			expect(hook?.selectionState).toBeNull();
			range.setStart(text, 5);
			range.setEnd(text, "site selection text".length);
			await act(async () => {
				document.dispatchEvent(new MouseEvent("mouseup"));
			});
			expect(hook?.selectionState).not.toBeNull();
			if (storage === "failure") expect(hook?.isIntroVisible).toBe(true);
		}
		await act(async () => {
			finishSave();
		});
		await act(async () => root.unmount());
	},
);

it("팝업 위치와 사이트 끄기 저장 실패를 메뉴 오류로 표시한다", async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML = "<p>site selection text</p><div id='root'></div>";
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => ({ left: 20, top: 20, bottom: 40 }),
	});
	mocks.query.mockResolvedValue({ highlights: [] });
	vi.mocked(ChromeSyncStorage.set).mockRejectedValue(
		new Error("storage unavailable"),
	);
	const options = {
		renderer: {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => null),
			clear: vi.fn(),
		},
		notesById: new Map<number, string>(),
	};
	let hook: ReturnType<typeof useHighlightSelection> | undefined;
	const TestHook = () => {
		hook = useHighlightSelection(options);

		return null;
	};
	const root = createRoot(document.getElementById("root") as HTMLElement);
	await act(async () => {
		root.render(createElement(TestHook));
	});
	await act(async () => {
		await hook?.handleBubblePositionClick();
	});
	expect(hook?.menuError).toBe("highlight_save_failed");
	expect(hook?.bubblePosition).toBe("below");
	const text = document.querySelector("p")?.firstChild as Text;
	const range = document.createRange();
	range.setStart(text, 0);
	range.setEnd(text, "site selection".length);
	document.getSelection()?.removeAllRanges();
	document.getSelection()?.addRange(range);
	await act(async () => {
		document.dispatchEvent(new MouseEvent("mouseup"));
	});
	await act(async () => {
		hook?.handleBubbleMenuClick();
	});
	expect(hook?.menuError).toBe("");
	expect(hook?.isMenuOpen).toBe(true);
	await act(async () => {
		await hook?.handleBubbleDisableClick("site");
	});
	expect(hook?.menuError).toBe("highlight_save_failed");
	expect(hook?.selectionState).not.toBeNull();
	vi.mocked(ChromeSyncStorage.set).mockClear();
	vi.mocked(analytics.trackEvent).mockClear();
	await act(async () => {
		hook?.handleBubbleCloseClick();
	});
	expect(hook?.selectionState).toBeNull();
	expect(hook?.isMenuOpen).toBe(false);
	expect(document.getSelection()?.toString()).toBe("site selection");
	expect(ChromeSyncStorage.set).not.toHaveBeenCalled();
	expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "highlight_bubble_dismiss",
	});
	await act(async () => {
		root.unmount();
	});
});

it("말풍선을 끄면 소개 대기 여부와 선택 길이를 함께 계측한다", async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML = "<p>site selection text</p><div id='root'></div>";
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => ({ left: 20, top: 20, bottom: 40 }),
	});
	mocks.query.mockResolvedValue({ highlights: [] });
	vi.mocked(ChromeSyncStorage.set).mockResolvedValue(undefined);
	const options = {
		renderer: {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => null),
			clear: vi.fn(),
		},
		notesById: new Map<number, string>(),
	};
	let hook: ReturnType<typeof useHighlightSelection> | undefined;
	const TestHook = () => {
		hook = useHighlightSelection(options);

		return null;
	};
	const root = createRoot(document.getElementById("root") as HTMLElement);
	await act(async () => {
		root.render(createElement(TestHook));
	});
	const text = document.querySelector("p")?.firstChild as Text;
	const range = document.createRange();
	range.setStart(text, 0);
	range.setEnd(text, "site selection".length);
	document.getSelection()?.removeAllRanges();
	document.getSelection()?.addRange(range);
	await act(async () => {
		document.dispatchEvent(new MouseEvent("mouseup"));
	});
	await act(async () => {
		await hook?.handleBubbleDisableClick("all");
	});
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "highlight_bubble_disable",
		params: {
			scope: "all",
			intro_pending: false,
			selection_length: "site selection".length,
		},
	});
	await act(async () => {
		root.unmount();
	});
});

it("연필로 생성한 직후에는 메모 없음으로 계측하고 실제 메모 저장 성공 후에만 수정 이벤트를 보낸다", async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML = "<p>sample highlight text</p><div id='root'></div>";
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => ({ left: 20, top: 20, bottom: 40 }),
	});
	mocks.query.mockResolvedValue({ highlights: [] });
	const row = {
		id: 1,
		exact_text: "sample highlight",
		text_position_start: 0,
		color: "yellow",
		note: null,
		url: location.href,
	} as HighlightRow;
	mocks.create.mockResolvedValue({ success: true, highlight: row });
	mocks.edit
		.mockResolvedValueOnce({ success: false, error: "save_failed" })
		.mockResolvedValueOnce({
			success: true,
			highlight: { ...row, note: "memo" },
		});
	const options = {
		renderer: {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => null),
			clear: vi.fn(),
		},
		notesById: new Map<number, string>(),
	};
	let hook: ReturnType<typeof useHighlightSelection> | undefined;
	const TestHook = () => {
		hook = useHighlightSelection(options);

		return null;
	};
	const root = createRoot(document.getElementById("root") as HTMLElement);
	await act(async () => {
		root.render(createElement(TestHook));
	});
	const text = document.querySelector("p")?.firstChild as Text;
	const range = document.createRange();
	range.setStart(text, 0);
	range.setEnd(text, "sample highlight".length);
	document.getSelection()?.removeAllRanges();
	document.getSelection()?.addRange(range);
	await act(async () => {
		document.dispatchEvent(new MouseEvent("mouseup"));
	});
	await act(async () => {
		await hook?.handleHighlightNoteClick();
	});
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "highlight_create",
		params: { color: "yellow", has_note: false },
	});
	expect(analytics.trackEvent).not.toHaveBeenCalledWith({
		name: "highlight_note_update",
	});
	await act(async () => {
		await hook?.handleHighlightEdit({ action: "note", note: "memo" });
	});
	expect(analytics.trackEvent).not.toHaveBeenCalledWith({
		name: "highlight_note_update",
	});
	await act(async () => {
		await hook?.handleHighlightEdit({ action: "note", note: "memo" });
	});
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "highlight_note_update",
	});
	await act(async () => {
		root.unmount();
	});
});
