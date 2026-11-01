// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMemoHighlights } from "./useMemoHighlights";

const mocks = vi.hoisted(() => ({ query: vi.fn(), getHighlights: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
	useQueries: mocks.query,
	useQuery: (option: unknown) => mocks.query({ queries: [option] })[0],
}));
vi.mock("@web-memo/shared/hooks", async () => {
	const { useStableBatches } = await vi.importActual<
		typeof import("../../../../../../../../../../../packages/shared/src/hooks/supabase/stableBatches")
	>(
		"../../../../../../../../../../../packages/shared/src/hooks/supabase/stableBatches",
	);
	return {
		useSupabaseClientQuery: () => ({ data: {} }),
		useSupabaseUserQuery: () => ({
			user: { data: { user: { id: "user-1" } } },
		}),
		useStableBatches,
	};
});
vi.mock("@web-memo/shared/utils", () => ({
	getPageKey: (url: string) => {
		const parsed = new URL(url);
		return `${parsed.origin}${parsed.pathname}`;
	},
	HighlightService: class {
		getHighlightsByUrls = mocks.getHighlights;
	},
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 하이라이트 조회 훅", () => {
	it("조회 실패 상태와 재시도를 UI에 전달한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const refetch = vi.fn();
		mocks.query.mockReturnValue([{ data: undefined, isError: true, refetch }]);
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(useMemoHighlights(["https://a.com"]));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(results[0].isHighlightLoadError).toBe(true);
		await results[0].refetchHighlights();
		expect(refetch).toHaveBeenCalledOnce();
		await act(async () => root.unmount());
	});
	it("URL을 중복 제거하고 같은 페이지의 하이라이트를 연결하며 오류를 전달한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const rows = [
			{ id: 1, url: "https://a.com" },
			{ id: 2, url: "https://a.com/" },
			{ id: 3, url: "https://a.com" },
		];
		mocks.query.mockReturnValue([{ data: rows }]);
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(
				useMemoHighlights(["https://a.com/", "https://a.com", "https://a.com"]),
			);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(results[0].highlightsByUrl.get("https://a.com")).toEqual(rows);
		expect(results[0].highlightsByUrl.get("https://a.com/")).toEqual(rows);
		const options = mocks.query.mock.calls[0][0].queries[0];
		expect(options.queryKey).toEqual([
			"highlights",
			"byUrls",
			"user-1",
			["https://a.com/"],
		]);
		mocks.getHighlights.mockResolvedValue({ data: rows, error: null });
		expect(await options.queryFn()).toEqual(rows);
		expect(mocks.getHighlights).toHaveBeenCalledWith(["https://a.com/"]);
		const queryError = {
			message: "조회 실패",
			code: "PGRST301",
			hint: "",
		};
		mocks.getHighlights.mockResolvedValue({
			data: null,
			error: queryError,
		});
		await expect(options.queryFn()).rejects.toBe(queryError);
		await act(async () => root.unmount());
	});
	it("빈 URL 목록은 조회하지 않는다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mocks.query.mockReturnValue([]);
		const TestHook = () => {
			useMemoHighlights([]);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(mocks.query.mock.calls[0][0].queries).toEqual([]);
		await act(async () => root.unmount());
	});
	it("다음 페이지를 붙여도 첫 배치 키와 표시를 유지하고 새 URL만 조회한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		let urls = Array.from(
			{ length: 20 },
			(_, index) => `https://a.com/${index}`,
		);
		const firstRow = { id: 1, url: urls[0] };
		mocks.query.mockImplementation(({ queries }) =>
			queries.map((query: { queryKey: unknown[] }) => ({
				data: (query.queryKey[3] as string[]).includes(firstRow.url)
					? [firstRow]
					: undefined,
				refetch: vi.fn(),
			})),
		);
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(useMemoHighlights(urls));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		const firstBatch = mocks.query.mock.lastCall?.[0].queries[0].queryKey;
		urls = [...urls, "https://a.com/20"];
		await act(async () => root.render(createElement(TestHook)));
		const nextQueries = mocks.query.mock.lastCall?.[0].queries;
		expect(nextQueries).toHaveLength(2);
		expect(nextQueries[0].queryKey).toEqual(firstBatch);
		expect(nextQueries[1].queryKey[3]).toEqual(["https://a.com/20"]);
		expect(results.at(-1)?.highlightsByUrl.get(firstRow.url)).toEqual([
			firstRow,
		]);
		await act(async () => root.unmount());
	});
	it("다른 배치에 걸친 같은 페이지 URL의 인용문을 중복 표시하지 않는다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		let urls = Array.from(
			{ length: 20 },
			(_, index) => `https://a.com/${index}`,
		);
		const row = { id: 1, url: urls[0] };
		mocks.query.mockImplementation(({ queries }) =>
			queries.map(() => ({ data: [row], refetch: vi.fn() })),
		);
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(useMemoHighlights(urls));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		urls = [...urls, "https://a.com/20"];
		await act(async () => root.render(createElement(TestHook)));
		expect(mocks.query.mock.lastCall?.[0].queries).toHaveLength(2);
		expect(results.at(-1)?.highlightsByUrl.get("https://a.com/0")).toEqual([
			row,
		]);
		await act(async () => root.unmount());
	});
	it("다음 페이지의 추적 URL 별칭은 기존 페이지 키를 공유한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		let urls = ["https://a.com/article"];
		mocks.query.mockReturnValue([{ data: [{ id: 1, url: urls[0] }] }]);
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(useMemoHighlights(urls));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		urls = [...urls, "https://a.com/article?utm_source=feed"];
		await act(async () => root.render(createElement(TestHook)));
		expect(mocks.query.mock.lastCall?.[0].queries).toHaveLength(1);
		expect(results.at(-1)?.highlightsByUrl.get(urls[1])).toEqual([
			{ id: 1, url: "https://a.com/article" },
		]);
		await act(async () => root.unmount());
	});
});
