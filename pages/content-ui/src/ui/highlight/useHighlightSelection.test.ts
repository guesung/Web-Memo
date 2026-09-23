// @vitest-environment jsdom

import { ChromeSyncStorage } from "@web-memo/shared/modules/chrome-storage";
import type { GetHighlightsByUrlResponse } from "@web-memo/shared/modules/extension-bridge";
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHighlightSelection } from "./useHighlightSelection";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	create: vi.fn(),
	edit: vi.fn(),
}));
vi.mock("./useHighlightBubbleGate", () => ({
	useHighlightBubbleGate: () => ({
		isBubbleAllowed: true,
		isIntroPending: false,
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
	STORAGE_KEYS: {},
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_HIGHLIGHTS_BY_URL: mocks.query,
			CREATE_HIGHLIGHT: mocks.create,
			EDIT_HIGHLIGHT: mocks.edit,
		},
	},
}));

afterEach(() => {
	vi.mocked(ChromeSyncStorage.set).mockReset();
	vi.clearAllMocks();
	window.history.replaceState(null, "", "/");
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("SPA 하이라이트 조회 생명주기", () => {
	it("최초 조회 중 URL이 바뀌어도 새 페이지를 복원하고 늦은 이전 응답은 무시한다", async () => {
		vi.useFakeTimers();
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		document.body.innerHTML = "<p>new page text</p><div id='root'></div>";
		const pending = new Map<
			string,
			(response: GetHighlightsByUrlResponse) => void
		>();
		mocks.query.mockImplementation(
			({ url }: { url: string }) =>
				new Promise<GetHighlightsByUrlResponse>((resolve) => {
					pending.set(url, resolve);
				}),
		);
		const renderer = {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => null),
			clear: vi.fn(),
		};
		const options = { renderer, notesById: new Map<number, string>() };
		const TestHook = () => {
			useHighlightSelection(options);

			return null;
		};
		const root = createRoot(document.getElementById("root") as HTMLElement);
		const originalUrl = location.href;
		await act(async () => {
			root.render(createElement(TestHook));
		});
		window.history.pushState(null, "", "/new-page");
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});
		expect(mocks.query).toHaveBeenCalledTimes(2);
		const newRow = {
			id: 2,
			exact_text: "new page text",
			prefix_text: "",
			suffix_text: "",
			text_position_start: 0,
			color: "yellow",
			note: "new note",
		} as HighlightRow;
		await act(async () => {
			pending.get(location.href)?.({ highlights: [newRow] });
		});
		await act(async () => {
			pending.get(originalUrl)?.({
				highlights: [{ ...newRow, id: 1, note: "old note" }],
			});
		});
		expect(renderer.add).toHaveBeenCalledOnce();
		expect(renderer.add).toHaveBeenCalledWith(2, expect.any(Range), "yellow");
		expect(options.notesById.get(2)).toBe("new note");
		expect(options.notesById.has(1)).toBe(false);
		await act(async () => {
			root.unmount();
		});
	});
});

it.each(["success", "failure"])(
	"A 편집 %s 중 늦게 나타나는 B를 계속 복원한다",
	async (result) => {
		vi.useFakeTimers();
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		document.body.innerHTML = "<p>first highlight</p><div id='root'></div>";
		const makeRow = (id: number, text: string) =>
			({
				id,
				exact_text: text,
				prefix_text: "",
				suffix_text: "",
				text_position_start: 0,
				color: "yellow",
				url: location.href,
				note: null,
			}) as HighlightRow;
		const first = makeRow(1, "first highlight");
		const second = makeRow(2, "late highlight");
		mocks.query.mockResolvedValue({
			highlights: [first, second, makeRow(3, "after edit highlight")],
		});
		let resolveEdit: (value: unknown) => void = () => {};
		mocks.edit.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveEdit = resolve;
				}),
		);
		const renderer = {
			add: vi.fn(),
			remove: vi.fn(),
			setColor: vi.fn(),
			hitTest: vi.fn(() => 1),
			clear: vi.fn(),
		};
		const options = { renderer, notesById: new Map<number, string>() };
		let hook: ReturnType<typeof useHighlightSelection> | undefined;
		const TestHook = () => {
			hook = useHighlightSelection(options);
			return null;
		};
		const root = createRoot(document.getElementById("root") as HTMLElement);
		await act(async () => {
			root.render(createElement(TestHook));
		});
		expect(renderer.add).toHaveBeenCalledWith(1, expect.any(Range), "yellow");
		let pending: Promise<void> | undefined;
		await act(async () => {
			document.dispatchEvent(
				new MouseEvent("click", { clientX: 10, clientY: 10 }),
			);
		});
		await act(async () => {
			pending = hook?.handleHighlightEdit({ action: "delete" });
		});
		await act(async () => {
			const paragraph = document.createElement("p");
			paragraph.textContent = "late highlight";
			document.body.append(paragraph);
			await vi.advanceTimersByTimeAsync(350);
		});
		expect(renderer.add).toHaveBeenCalledWith(2, expect.any(Range), "yellow");
		await act(async () => {
			resolveEdit(
				result === "success"
					? { success: true, highlight: first }
					: { success: false, error: "save_failed" },
			);
			await pending;
		});
		expect(renderer.remove).toHaveBeenCalledTimes(result === "success" ? 1 : 0);
		await act(async () => {
			const paragraph = document.createElement("p");
			paragraph.textContent = "after edit highlight";
			document.body.append(paragraph);
			await vi.advanceTimersByTimeAsync(350);
		});
		expect(renderer.add).toHaveBeenCalledWith(3, expect.any(Range), "yellow");

		await act(async () => {
			root.unmount();
		});
	},
);
