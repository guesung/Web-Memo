// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoDialog from "./index";

const MOCKS = vi.hoisted(() => ({
	memo: {
		id: 1,
		url: "https://example.com/first",
		title: "제목",
		memo: "본문",
	} as { id: number; url: string; title: string; memo: string } | undefined,
	highlights: vi.fn(),
	refetch: vi.fn(),
}));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useMemoQuery: () => ({ memo: MOCKS.memo }),
	useSettingQuery: () => ({ showImpression: true, showActionItem: true }),
	useTextareaAutoResize: () => ({
		textareaRef: { current: null },
		handleTextareaChange: vi.fn(),
	}),
	useMemoPatchMutation: () => ({ mutate: vi.fn() }),
	useDebounce: () => ({ debounce: vi.fn(), flushDebounce: vi.fn() }),
	useKeyboardBind: vi.fn(),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({}),
}));
vi.mock("@web-memo/shared/utils", () => ({ adjustTextareaHeight: vi.fn() }));
vi.mock("../MemoView/_hooks/useMemoHighlights", () => ({
	useMemoHighlights: MOCKS.highlights,
}));
vi.mock("../MemoCardHeader", () => ({ default: () => null }));
vi.mock("../MemoCardFooter", () => ({ default: () => null }));
vi.mock("./SaveStatusIndicator", () => ({
	default: () => createElement("span", { "data-testid": "save-status" }),
}));
vi.mock("framer-motion", () => ({
	motion: { div: ({ children }: { children: ReactNode }) => children },
}));
vi.mock("@web-memo/ui", () => ({
	Card: ({ children }: { children: ReactNode }) => children,
	CardContent: ({ children }: { children: ReactNode }) => children,
	Dialog: ({ children }: { children: ReactNode }) => children,
	DialogContent: ({ children }: { children: ReactNode }) => children,
	Textarea: (props: object) => createElement("textarea", props),
}));

const CONTAINER = document.createElement("div");
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	MOCKS.memo = {
		id: 1,
		url: "https://example.com/first",
		title: "제목",
		memo: "본문",
	};
	MOCKS.highlights.mockReturnValue({
		highlightsByUrl: new Map(),
		isHighlightLoadError: false,
		refetchHighlights: MOCKS.refetch,
	});
	root = createRoot(CONTAINER);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 상세 하이라이트", () => {
	it("목록 없이 상세 메모 URL로 조회하고 입력 영역 뒤, 저장 상태 앞에 표시한다", async () => {
		MOCKS.highlights.mockReturnValue({
			highlightsByUrl: new Map([
				[
					MOCKS.memo?.url,
					[{ id: 1, exact_text: "선택한 원문", color: "yellow" }],
				],
			]),
			isHighlightLoadError: false,
			refetchHighlights: MOCKS.refetch,
		});
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 1 })),
		);
		expect(MOCKS.highlights).toHaveBeenCalledWith([
			"https://example.com/first",
		]);
		expect(CONTAINER.querySelector("mark")?.textContent).toBe("선택한 원문");
		const html = CONTAINER.innerHTML;
		expect(html.indexOf("action-item-textarea")).toBeLessThan(
			html.indexOf("<mark"),
		);
		expect(html.indexOf("<mark")).toBeLessThan(html.indexOf("save-status"));
	});
	it("다른 상세 메모로 전환하면 새 URL을 조회한다", async () => {
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 1 })),
		);
		MOCKS.memo = {
			title: "제목",
			memo: "본문",
			id: 2,
			url: "https://example.com/second",
		};
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 2 })),
		);
		expect(MOCKS.highlights).toHaveBeenLastCalledWith([
			"https://example.com/second",
		]);
		expect(CONTAINER.querySelector("section")).toBeNull();
	});
	it("메모가 아직 없으면 빈 URL 목록을 전달한다", async () => {
		MOCKS.memo = undefined;
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 1 })),
		);
		expect(MOCKS.highlights).toHaveBeenCalledWith([]);
		expect(CONTAINER.innerHTML).toBe("");
	});
	it("조회 오류를 알리고 재시도할 수 있다", async () => {
		MOCKS.highlights.mockReturnValue({
			highlightsByUrl: new Map(),
			isHighlightLoadError: true,
			refetchHighlights: MOCKS.refetch,
		});
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 1 })),
		);
		expect(CONTAINER.querySelector('[role="alert"]')?.textContent).toContain(
			"highlight.loadError",
		);
		await act(async () => CONTAINER.querySelector("button")?.click());
		expect(MOCKS.refetch).toHaveBeenCalledOnce();
	});
});
