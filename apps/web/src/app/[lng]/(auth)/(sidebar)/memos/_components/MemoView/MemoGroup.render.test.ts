// @vitest-environment jsdom
import type {
	GetMemoResponse,
	HighlightMemoLink,
	HighlightRow,
} from "@web-memo/shared/types";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemoGroup from "./MemoGroup";

const { headerRender } = vi.hoisted(() => ({ headerRender: vi.fn() }));

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({ set: vi.fn(), getUrl: () => "/" }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/utils", async () => {
	const { cn } = await import(
		"../../../../../../../../../../packages/shared/src/utils/Tailwind"
	);
	return { cn };
});
vi.mock("../MemoCardHeader", () => ({
	default: ({ memo }: { memo: GetMemoResponse }) => {
		headerRender(memo.id);
		return null;
	},
}));
vi.mock("../MemoCardFooter", () => ({
	default: ({ highlightCount }: { highlightCount?: number }) =>
		createElement("span", null, `highlight-count:${highlightCount ?? 0}`),
}));
vi.mock("./_hooks/useIsContentClamped", () => ({
	default: () => ({ containerRef: () => {}, isContentClamped: false }),
}));
vi.mock("framer-motion", () => ({
	motion: { div: ({ children }: { children: ReactNode }) => children },
}));
vi.mock("@web-memo/ui", () => ({
	Card: ({ children }: { children: ReactNode }) => children,
	CardContent: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@egjs/react-infinitegrid", () => ({
	MasonryInfiniteGrid: ({ children }: { children: ReactNode }) =>
		createElement("ul", null, children),
}));

const memos = Array.from({ length: 21 }, (_, index) => ({
	id: index + 1,
	url: `https://example.com/${index + 1}`,
	memo: `본문 ${index + 1}`,
})) as GetMemoResponse[];
const highlight = {
	id: 1,
	exact_text: "인용문",
	color: "yellow",
} as HighlightRow;
const sourcesByMemo = new Map<number, HighlightMemoLink>();

const renderGroup = (
	memoList: GetMemoResponse[],
	highlightsByUrl: Map<string, HighlightRow[]>,
	showImpression = true,
	sources = sourcesByMemo,
) =>
	createElement(MemoGroup, {
		lng: "ko",
		groupKey: "2026-10-28",
		memos: memoList,
		highlightsByUrl,
		sourcesByMemo: sources,
		showImpression,
		showActionItem: true,
		truncateMemoContent: true,
	});

const highlightMap = (count: number) =>
	new Map(memos.slice(0, count).map((memo) => [memo.url, [highlight]]));

describe("MemoGroup 카드 렌더 경계", () => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	let container: HTMLDivElement;
	let root: ReturnType<typeof createRoot>;

	afterEach(() => {
		if (root) act(() => root.unmount());
		container?.remove();
		headerRender.mockClear();
	});

	it("표시값이 같은 새 하이라이트 배열과 20→21개 추가에서는 기존 카드를 다시 렌더하지 않는다", () => {
		container = document.createElement("div");
		root = createRoot(container);
		act(() => root.render(renderGroup(memos.slice(0, 20), highlightMap(20))));
		expect(headerRender).toHaveBeenCalledTimes(20);

		act(() => root.render(renderGroup(memos.slice(0, 20), highlightMap(20))));
		expect(headerRender).toHaveBeenCalledTimes(20);

		act(() => root.render(renderGroup(memos, highlightMap(21))));
		expect(headerRender).toHaveBeenCalledTimes(21);
	});

	it("개수·인용문·본문 변경은 해당 카드에, 표시 설정 변경은 모든 카드에 반영한다", () => {
		container = document.createElement("div");
		root = createRoot(container);
		const twoMemos = memos.slice(0, 2);
		act(() => root.render(renderGroup(twoMemos, highlightMap(2))));
		expect(headerRender.mock.calls.map(([id]) => id)).toEqual([1, 2]);
		headerRender.mockClear();

		const changedCounts = highlightMap(2);
		changedCounts.set(twoMemos[0].url, [highlight, highlight]);
		act(() => root.render(renderGroup(twoMemos, changedCounts)));
		expect(headerRender.mock.calls.map(([id]) => id)).toEqual([1]);
		expect(container.textContent).toContain("highlight-count:2");
		headerRender.mockClear();

		const source = {
			exact_text: "새 인용문",
			color: "yellow",
		} as HighlightMemoLink;
		const changedSources = new Map([[twoMemos[1].id, source]]);
		act(() =>
			root.render(renderGroup(twoMemos, changedCounts, true, changedSources)),
		);
		expect(headerRender.mock.calls.map(([id]) => id)).toEqual([2]);
		expect(container.textContent).toContain("새 인용문");
		headerRender.mockClear();

		const changedMemos = [{ ...twoMemos[0], memo: "바뀐 본문" }, twoMemos[1]];
		act(() =>
			root.render(
				renderGroup(changedMemos, changedCounts, true, changedSources),
			),
		);
		expect(headerRender.mock.calls.map(([id]) => id)).toEqual([1]);
		expect(container.textContent).toContain("바뀐 본문");
		headerRender.mockClear();

		act(() =>
			root.render(
				renderGroup(changedMemos, changedCounts, false, changedSources),
			),
		);
		expect(headerRender.mock.calls.map(([id]) => id)).toEqual([1, 2]);
	});
});
