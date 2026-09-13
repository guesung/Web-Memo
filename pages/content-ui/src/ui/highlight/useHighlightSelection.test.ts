// @vitest-environment jsdom
import type { GetHighlightsByUrlResponse } from "@web-memo/shared/modules/extension-bridge";
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHighlightSelection } from "./useHighlightSelection";

const mocks = vi.hoisted(() => ({ query: vi.fn(), create: vi.fn() }));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_HIGHLIGHTS_BY_URL: mocks.query,
			CREATE_HIGHLIGHT: mocks.create,
		},
	},
}));

afterEach(() => {
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
