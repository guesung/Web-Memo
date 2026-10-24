// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightView } from "./HighlightView";

const QUERY = vi.hoisted(() => ({
	result: {} as Record<string, unknown>,
	fetchNextPage: vi.fn(),
	refetch: vi.fn(),
	targetRow: null as { id: number; url: string } | null,
	intersect: undefined as (() => void) | undefined,
	highlightId: null as string | null,
}));

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useHighlightMemoLinks: () => ({
		data: [],
		isPending: false,
		isError: false,
		refetch: vi.fn(),
	}),
	useSupabaseClientQuery: () => ({ data: {} }),
	useSupabaseUserQuery: () => ({
		user: { data: { user: { id: "test-user" } } },
	}),
	useDebounce: () => ({
		debounce: (callback: () => void) => callback(),
		abortDebounce: vi.fn(),
	}),
}));
vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: QUERY.targetRow, isError: false }),
}));
vi.mock("next/navigation", () => ({
	useSearchParams: () =>
		new URLSearchParams(
			QUERY.highlightId ? `highlightId=${QUERY.highlightId}` : "",
		),
}));
vi.mock("@web-memo/shared/constants", () => ({
	HIGHLIGHT_COLORS: ["yellow"],
	HIGHLIGHT_COLOR_STYLE: { yellow: { bar: "#facc15" } },
}));
vi.mock("@web-memo/shared/utils", () => ({
	cn: (...values: Array<string | false | undefined>) =>
		values.filter(Boolean).join(" "),
}));
vi.mock("@web-memo/shared/modules/highlight", () => ({
	groupHighlightsByUrl: (rows: Array<{ url: string }>) => {
		const groups = new Map<string, Array<{ url: string }>>();
		for (const row of rows)
			groups.set(row.url, [...(groups.get(row.url) ?? []), row]);
		return [...groups].map(([url, highlights]) => ({
			url,
			highlights,
		}));
	},
}));
vi.mock("@web-memo/ui", () => ({
	Input: (props: Record<string, unknown>) => createElement("input", props),
	Skeleton: () => createElement("div", { "data-testid": "skeleton" }),
}));
vi.mock("../_hooks", () => ({
	useHighlightList: () => ({
		...QUERY.result,
		fetchNextPage: QUERY.fetchNextPage,
		refetch: QUERY.refetch,
	}),
	useHighlightCounts: () => new Map(),
}));
vi.mock("./HighlightGroupCard", () => ({
	HighlightGroupCard: ({
		group,
	}: {
		group: { url: string; highlights: unknown[] };
	}) =>
		createElement(
			"article",
			{ "data-url": group.url },
			`saved group ${group.highlights.length}`,
		),
}));

const roots: Root[] = [];

function renderView() {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	roots.push(root);
	act(() => root.render(createElement(HighlightView, { lng: "ko" })));
	return { container, root };
}

function nearBottom(container: HTMLElement) {
	if (!container.querySelector('[data-testid="highlight-list-sentinel"]'))
		throw new Error("Highlight list sentinel missing");
	act(() => QUERY.intersect?.());
}

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	QUERY.fetchNextPage.mockClear();
	QUERY.refetch.mockClear();
	QUERY.targetRow = null;
	QUERY.intersect = undefined;
	QUERY.highlightId = null;
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			constructor(callback: IntersectionObserverCallback) {
				QUERY.intersect = () =>
					callback(
						[{ isIntersecting: true } as IntersectionObserverEntry],
						{} as IntersectionObserver,
					);
			}
			observe() {}
			disconnect() {}
		},
	);
	QUERY.result = {
		data: { pages: [[{ id: 1, url: "https://example.com" }]] },
		hasNextPage: true,
		isFetching: false,
		isFetchingNextPage: false,
		isPending: false,
		isError: false,
		isRefetchError: false,
		isFetchNextPageError: false,
	};
});

afterEach(() => {
	for (const root of roots.splice(0)) {
		act(() => root.unmount());
	}
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

describe("하이라이트 목록 상태", () => {
	it("첫 조회가 진행 중이면 한 열 인용 목록 스켈레톤을 보여준다", () => {
		QUERY.result = { ...QUERY.result, data: undefined, isPending: true };
		const { container } = renderView();
		expect(container.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(
			15,
		);
		expect(container.textContent).not.toContain("saved group");
	});

	it("첫 조회 실패 시 오류와 재시도를 제공한다", () => {
		QUERY.result = { ...QUERY.result, data: undefined, isError: true };
		const { container } = renderView();
		expect(container.textContent).toContain("highlight.loadError");
		const retry = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "error.500.retry",
		);
		act(() => retry?.click());
		expect(QUERY.refetch).toHaveBeenCalledTimes(1);
	});

	it("배경 갱신 실패 시 기존 그룹을 유지하고 재시도한다", () => {
		QUERY.result = { ...QUERY.result, isError: true, isRefetchError: true };
		const { container } = renderView();
		expect(container.textContent).toContain("saved group");
		expect(container.textContent).toContain("highlight.loadError");
		const retry = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "error.500.retry",
		);
		act(() => retry?.click());
		expect(QUERY.refetch).toHaveBeenCalledTimes(1);
	});

	it("추가 페이지 실패 시 그룹을 유지하고 추가 페이지만 재시도한다", () => {
		QUERY.result = {
			...QUERY.result,
			isError: true,
			isFetchNextPageError: true,
		};
		const { container } = renderView();
		expect(container.textContent).toContain("saved group");
		expect(container.textContent).not.toContain("highlight.loadMore");
		const retry = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "error.500.retry",
		);
		act(() => retry?.click());
		expect(QUERY.fetchNextPage).toHaveBeenCalledTimes(1);
		expect(QUERY.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
		expect(QUERY.refetch).not.toHaveBeenCalled();
	});

	it("한 열 목록 끝에서 한 번 조회하고 같은 페이지에서는 중복 호출을 막는다", () => {
		const { container } = renderView();
		nearBottom(container);
		nearBottom(container);
		expect(QUERY.fetchNextPage).toHaveBeenCalledTimes(1);
		expect(container.querySelector("#highlight-grid")).toBeNull();
		expect(
			container.querySelector("article")?.parentElement?.parentElement
				?.className,
		).toContain("flex-col");
		expect(container.textContent).not.toContain("highlight.loadMore");
	});

	it("추가 로딩 중에는 스크롤 요청을 막는다", () => {
		QUERY.result = {
			...QUERY.result,
			isFetching: true,
			isFetchingNextPage: true,
		};
		const { container } = renderView();
		nearBottom(container);
		expect(container.querySelector("output")?.textContent).toBe(
			"highlight.loadingMore",
		);
		expect(QUERY.fetchNextPage).not.toHaveBeenCalled();
	});

	it("같은 URL 행만 추가되어도 화면 끝이면 다음 페이지를 이어서 조회한다", () => {
		const { container, root } = renderView();
		nearBottom(container);
		expect(QUERY.fetchNextPage).toHaveBeenCalledTimes(1);
		QUERY.result = {
			...QUERY.result,
			data: {
				pages: [
					[{ id: 1, url: "https://example.com" }],
					[{ id: 2, url: "https://example.com" }],
				],
			},
		};
		act(() => root.render(createElement(HighlightView, { lng: "ko" })));
		nearBottom(container);
		expect(container.querySelectorAll("article")).toHaveLength(1);
		expect(container.querySelector("article")?.textContent).toContain("2");
		expect(QUERY.fetchNextPage).toHaveBeenCalledTimes(2);
	});

	it("deep link 행이 이미 로드된 URL이면 카드 하나로 합친다", () => {
		QUERY.highlightId = "3";
		QUERY.targetRow = { id: 3, url: "https://example.com" };
		const { container } = renderView();
		expect(container.querySelectorAll("article")).toHaveLength(1);
		expect(container.querySelector("article")?.textContent).toContain("2");
	});

	it("추가 조회 재시도가 진행 중이면 재시도 버튼도 중복 호출을 막는다", () => {
		QUERY.result = {
			...QUERY.result,
			isError: true,
			isFetchNextPageError: true,
			isFetching: true,
		};
		const { container } = renderView();
		const retry = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "error.500.retry",
		);
		expect(retry?.disabled).toBe(true);
		act(() => retry?.click());
		expect(QUERY.fetchNextPage).not.toHaveBeenCalled();
	});

	it("필터 결과 없음과 저장 항목 없음은 다른 상태로 표시한다", () => {
		QUERY.result = {
			...QUERY.result,
			data: { pages: [[]] },
			hasNextPage: false,
		};
		const { container } = renderView();
		expect(container.textContent).toContain("highlight.empty.title");
		const colorButton = [...container.querySelectorAll("button")].find(
			(button) => button.getAttribute("aria-label") === "yellow",
		);
		act(() => colorButton?.click());
		expect(container.textContent).toContain("highlight.noResult");
		const clearButton = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "highlight.clearFilters",
		);
		act(() => clearButton?.click());
		expect(container.textContent).toContain("highlight.empty.title");
	});
});
