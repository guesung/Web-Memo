// @vitest-environment jsdom
import { analytics } from "@web-memo/shared/modules/analytics";
import type { HighlightRow } from "@web-memo/shared/types";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HighlightEditToolbar } from "./HighlightEditToolbar";

const requests = vi.hoisted(() => ({
	links: vi.fn(),
	createMemo: vi.fn(),
}));
vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://www.webmemo.xyz" },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_HIGHLIGHT_MEMO_LINKS: requests.links,
			CREATE_MEMO_FROM_HIGHLIGHT: requests.createMemo,
		},
	},
}));
vi.mock("../../utils/reportError", () => ({ reportContentUiError: vi.fn() }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

const makeState = (id: number) => ({
	row: {
		id,
		color: "yellow",
		note: "same note",
		exact_text: "quoted text",
	} as HighlightRow,
	x: 10,
	y: 10,
	isSaving: false,
	message: "",
});

afterEach(() => {
	requests.links.mockReset();
	requests.createMemo.mockReset();
	vi.clearAllMocks();
	document.body.innerHTML = "";
	vi.unstubAllGlobals();
});

describe("하이라이트 메모 편집 UI", () => {
	it("연결 조회 실패 시 새 메모 작성을 막고 재조회 후 작성한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		requests.links
			.mockResolvedValueOnce({ success: false, reason: "load_failed" })
			.mockResolvedValueOnce({ success: true, links: [] });
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					onHighlightEdit: vi.fn(),
				}),
			);
		});
		expect(container.textContent).toContain("highlight_memo_load_failed");
		expect(container.textContent).not.toContain("highlight_memo_add");
		await act(async () => {
			container.querySelector<HTMLButtonElement>("button.underline")?.click();
		});
		expect(container.textContent).toContain("highlight_memo_add");
		await act(async () => root.unmount());
	});

	it("저장 실패 후 입력을 보존하고 같은 하이라이트 ID로 재시도한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		requests.links.mockResolvedValue({ success: true, links: [] });
		requests.createMemo
			.mockResolvedValueOnce({ success: false, reason: "save_failed" })
			.mockResolvedValueOnce({
				success: true,
				memoId: 42,
				created: true,
				deletedAt: null,
			});
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					initialMemoOpen: true,
					onHighlightEdit: vi.fn(),
				}),
			);
		});
		const input = container.querySelector<HTMLTextAreaElement>("textarea");
		expect(container.textContent).toContain("quoted text");
		await act(async () => {
			if (!input) throw new Error("memo input missing");
			const setter = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				"value",
			)?.set;
			setter?.call(input, "my thought");
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await act(async () => {
			container
				.querySelector<HTMLFormElement>("form:last-of-type")
				?.dispatchEvent(
					new Event("submit", { bubbles: true, cancelable: true }),
				);
		});
		expect(input?.value).toBe("my thought");
		expect(container.textContent).toContain("highlight_memo_save_failed");
		await act(async () => {
			container
				.querySelector<HTMLFormElement>("form:last-of-type")
				?.dispatchEvent(
					new Event("submit", { bubbles: true, cancelable: true }),
				);
		});
		expect(requests.createMemo).toHaveBeenNthCalledWith(1, {
			highlightId: 1,
			memo: "my thought",
		});
		expect(requests.createMemo).toHaveBeenNthCalledWith(2, {
			highlightId: 1,
			memo: "my thought",
		});
		expect(container.querySelector<HTMLAnchorElement>("a")?.href).toBe(
			"https://www.webmemo.xyz/memos?id=42",
		);
		expect(analytics.trackEvent).not.toHaveBeenCalled();
		await act(async () => {
			container.querySelector<HTMLAnchorElement>("a")?.click();
		});
		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "memo_open",
			params: { source: "highlight", has_search_query: false },
		});
		await act(async () => root.unmount());
	});

	it("휴지통에 연결된 메모는 새 메모를 만들지 않고 복원 경로를 연다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		requests.links.mockResolvedValue({
			success: true,
			links: [
				{
					highlight_id: 1,
					memo_id: 42,
					memo: { id: 42, memo: "saved", deleted_at: "2026-10-11T00:00:00Z" },
				},
			],
		});
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					onHighlightEdit: vi.fn(),
				}),
			);
		});
		const link = container.querySelector<HTMLAnchorElement>("a");
		expect(link?.href).toBe("https://www.webmemo.xyz/memos/trash?id=42");
		expect(link?.textContent).toBe("highlight_memo_restore");
		expect(container.textContent).not.toContain("highlight_memo_add");
		expect(requests.createMemo).not.toHaveBeenCalled();
		expect(analytics.trackEvent).not.toHaveBeenCalled();
		await act(async () => root.unmount());
	});

	it("저장 요청이 진행되는 동안 중복 제출을 차단한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		requests.links.mockResolvedValue({ success: true, links: [] });
		let resolveSave: (value: unknown) => void = () => {};
		requests.createMemo.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveSave = resolve;
				}),
		);
		vi.stubGlobal("open", vi.fn());
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		await act(async () => {
			root.render(
				createElement(HighlightEditToolbar, {
					state: makeState(1),
					initialMemoOpen: true,
					onHighlightEdit: vi.fn(),
				}),
			);
		});
		const input = container.querySelector<HTMLTextAreaElement>("textarea");
		await act(async () => {
			const setter = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				"value",
			)?.set;
			setter?.call(input, "one memo");
			input?.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await act(async () => {
			const form = container.querySelector<HTMLFormElement>("form");
			form?.dispatchEvent(
				new Event("submit", { bubbles: true, cancelable: true }),
			);
			form?.dispatchEvent(
				new Event("submit", { bubbles: true, cancelable: true }),
			);
		});
		expect(requests.createMemo).toHaveBeenCalledTimes(1);
		await act(async () => {
			resolveSave({ success: false, reason: "save_failed" });
		});
		await act(async () => root.unmount());
	});
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
