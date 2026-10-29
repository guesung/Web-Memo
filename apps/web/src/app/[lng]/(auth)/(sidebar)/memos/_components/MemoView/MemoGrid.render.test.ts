// @vitest-environment jsdom
import type { GetMemoResponse, HighlightRow } from "@web-memo/shared/types";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import MemoGrid from "./MemoGrid";

const { headerRender, handleSelectMemoItem } = vi.hoisted(() => ({
	headerRender: vi.fn(),
	handleSelectMemoItem: vi.fn(),
}));

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@src/modules/observability/client", () => ({
	reportMemoLoadStage: vi.fn(),
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useDeleteMemosMutation: () => ({ mutate: vi.fn() }),
	useMemosUpsertMutation: () => ({ mutate: vi.fn() }),
	useKeyboardBind: vi.fn(),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({
		set: vi.fn(),
		removeAll: vi.fn(),
		getUrl: () => "/",
	}),
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
vi.mock("@src/components", () => ({ DragBox: () => null }));
vi.mock("./_hooks", () => ({
	useMemoSelection: () => ({
		selectedMemoIds: [],
		isSelectingMode: false,
		checkMemoSelected: () => false,
		handleSelectMemoItem,
		setSelectedMemoIds: () => {},
		clearSelection: () => {},
	}),
	useDragSelection: () => ({ rafRef: { current: null } }),
	useSuppressEscapeWhenMenuOpen: () => ({
		wasMenuOpenOnEscapeRef: { current: false },
	}),
}));
vi.mock("./_hooks/useMemoSettings", () => ({
	useMemoSettings: () => ({
		showImpression: true,
		showActionItem: true,
		truncateMemoContent: true,
	}),
}));
vi.mock("./DeleteConfirmDialog", () => ({ default: () => null }));
vi.mock("./MemoItemSkeleton", () => ({ MemoItemSkeleton: () => null }));
vi.mock("../MemoCardHeader", () => ({
	default: ({ memo }: { memo: GetMemoResponse }) => {
		headerRender(memo.id);
		return null;
	},
}));
vi.mock("../MemoCardFooter", () => ({ default: () => null }));
vi.mock("./_hooks/useIsContentClamped", () => ({
	default: () => ({ containerRef: () => {}, isContentClamped: false }),
}));
vi.mock("framer-motion", () => ({
	AnimatePresence: ({ children }: { children: ReactNode }) => children,
	motion: { div: ({ children }: { children: ReactNode }) => children },
}));
vi.mock("@web-memo/ui", () => ({
	Card: ({ children }: { children: ReactNode }) => children,
	CardContent: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@egjs/react-infinitegrid", () => ({
	MasonryInfiniteGrid: ({ children }: { children: ReactNode }) =>
		createElement("div", null, children),
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
const highlightMap = (count: number) =>
	new Map(memos.slice(0, count).map((memo) => [memo.url, [highlight]]));

describe("MemoGrid 카드 렌더 경계", () => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;

	it("새 하이라이트 배열과 20→21개 추가에서 기존 카드를 다시 렌더하지 않는다", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		const renderGrid = (
			memoList: GetMemoResponse[],
			highlightsByUrl: Map<string, HighlightRow[]>,
		) =>
			createElement(MemoGrid, {
				lng: "ko",
				memos: memoList,
				highlightsByUrl,
				sourcesByMemo: new Map(),
				searchQuery: "",
				domain: undefined,
				hasNextPage: false,
				isFetchingNextPage: false,
				fetchNextPage: () => {},
				loadOutcome: "success",
				route: "/memos",
				navigationId: null,
			});

		act(() => root.render(renderGrid(memos.slice(0, 20), highlightMap(20))));
		expect(headerRender).toHaveBeenCalledTimes(20);
		act(() => root.render(renderGrid(memos.slice(0, 20), highlightMap(20))));
		expect(headerRender).toHaveBeenCalledTimes(20);
		act(() => root.render(renderGrid(memos, highlightMap(21))));
		expect(headerRender).toHaveBeenCalledTimes(21);
		act(() => root.unmount());
	});
});
