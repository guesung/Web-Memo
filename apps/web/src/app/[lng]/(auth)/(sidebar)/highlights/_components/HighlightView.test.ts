// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightView } from "./HighlightView";

const QUERY = vi.hoisted(() => ({
	result: {} as Record<string, unknown>,
	fetchNextPage: vi.fn(),
	refetch: vi.fn(),
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
	useQuery: () => ({ data: null, isError: false }),
}));
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
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
	groupHighlightsByUrl: (rows: unknown[]) =>
		rows.length ? [{ url: "https://example.com", highlights: rows }] : [],
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
	HighlightGroupCard: () => createElement("article", null, "saved group"),
}));

const roots: Root[] = [];

function renderView() {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	roots.push(root);
	act(() => root.render(createElement(HighlightView, { lng: "ko" })));
	return container;
}

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	QUERY.fetchNextPage.mockClear();
	QUERY.refetch.mockClear();
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
});

describe("하이라이트 목록 상태", () => {
	it("첫 조회가 진행 중이면 그룹 모양 스켈레톤을 보여준다", () => {
		QUERY.result = { ...QUERY.result, data: undefined, isPending: true };
		const container = renderView();
		expect(container.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(
			9,
		);
		expect(container.textContent).not.toContain("saved group");
	});

	it("첫 조회 실패 시 오류와 재시도를 제공한다", () => {
		QUERY.result = { ...QUERY.result, data: undefined, isError: true };
		const container = renderView();
		expect(container.textContent).toContain("highlight.loadError");
		const retry = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "error.500.retry",
		);
		act(() => retry?.click());
		expect(QUERY.refetch).toHaveBeenCalledTimes(1);
	});

	it("배경 갱신 실패 시 기존 그룹을 유지하고 재시도한다", () => {
		QUERY.result = { ...QUERY.result, isError: true, isRefetchError: true };
		const container = renderView();
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
		const container = renderView();
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

	it("추가 로딩 중에는 더 보기 중복 호출을 막는다", () => {
		QUERY.result = {
			...QUERY.result,
			isFetching: true,
			isFetchingNextPage: true,
		};
		const container = renderView();
		const button = [...container.querySelectorAll("button")].find(
			(element) => element.textContent === "highlight.loadingMore",
		);
		expect(button?.disabled).toBe(true);
		expect(QUERY.fetchNextPage).not.toHaveBeenCalled();
	});

	it("추가 조회 재시도가 진행 중이면 재시도 버튼도 중복 호출을 막는다", () => {
		QUERY.result = {
			...QUERY.result,
			isError: true,
			isFetchNextPageError: true,
			isFetching: true,
		};
		const container = renderView();
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
		const container = renderView();
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
