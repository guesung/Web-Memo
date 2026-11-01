// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHighlightMemoLinks } from "./useHighlightMemos";

const mocks = vi.hoisted(() => ({
	queries: vi.fn(),
	getByMemoIds: vi.fn(),
	getByHighlightIds: vi.fn(),
	userId: "user-1",
}));
vi.mock("@tanstack/react-query", () => ({
	useQueries: mocks.queries,
	useQuery: (option: unknown) => mocks.queries({ queries: [option] })[0],
	useMutation: vi.fn(),
	useQueryClient: vi.fn(),
}));
vi.mock("./queries", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
	useSupabaseUserQuery: () => ({
		user: { data: { user: { id: mocks.userId } } },
	}),
}));
vi.mock("../../modules/analytics", () => ({ analytics: {} }));
vi.mock("../../utils/supabase/highlightMemoService", () => ({
	HighlightMemoService: class {
		getByMemoIds = mocks.getByMemoIds;
		getByHighlightIds = mocks.getByHighlightIds;
	},
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	mocks.userId = "user-1";
});

describe("인용문 출처 배치 조회", () => {
	it("추가 ID만 별도 조회하고 기존 출처와 재시도 계약을 유지한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		let ids = Array.from({ length: 20 }, (_, index) => index + 1);
		const firstLink = { memo_id: 1, highlight_id: 101 };
		const retry = vi.fn();
		mocks.queries.mockImplementation(({ queries }) =>
			queries.map((query: { queryKey: unknown[] }) => ({
				data: (query.queryKey[4] as number[]).includes(1)
					? [firstLink]
					: undefined,
				isError: false,
				refetch: retry,
			})),
		);
		const results: ReturnType<typeof useHighlightMemoLinks>[] = [];
		const TestHook = () => {
			results.push(useHighlightMemoLinks(ids, "memo"));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		const firstKey = mocks.queries.mock.lastCall?.[0].queries[0].queryKey;
		ids = [...ids, 21];
		await act(async () => root.render(createElement(TestHook)));
		const nextQueries = mocks.queries.mock.lastCall?.[0].queries;
		expect(nextQueries).toHaveLength(2);
		expect(nextQueries[0].queryKey).toEqual(firstKey);
		expect(nextQueries[1].queryKey[4]).toEqual([21]);
		expect(results.at(-1)?.data).toEqual([firstLink]);
		await results.at(-1)?.refetch();
		expect(retry).toHaveBeenCalledTimes(2);
		await act(async () => root.unmount());
	});

	it("계정 전환은 캐시 키와 반환 데이터를 분리한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mocks.queries.mockImplementation(({ queries }) =>
			queries.map(() => ({ data: [], refetch: vi.fn() })),
		);
		const TestHook = () => {
			useHighlightMemoLinks([1], "memo");
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		mocks.userId = "user-2";
		await act(async () => root.render(createElement(TestHook)));
		expect(mocks.queries.mock.lastCall?.[0].queries[0].queryKey).toEqual([
			"memos",
			"highlightSources",
			"user-2",
			"memo",
			[1],
		]);
		await act(async () => root.unmount());
	});
	it("한 배치만 실패하면 성공한 출처는 유지하고 실패 배치만 재시도한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const successfulRetry = vi.fn();
		const failedRetry = vi.fn();
		mocks.queries.mockReturnValue([
			{
				data: [{ memo_id: 1, highlight_id: 101 }],
				isError: false,
				refetch: successfulRetry,
			},
			{ data: undefined, isError: true, refetch: failedRetry },
		]);
		let result: ReturnType<typeof useHighlightMemoLinks> | undefined;
		const TestHook = () => {
			result = useHighlightMemoLinks(
				Array.from({ length: 21 }, (_, index) => index + 1),
				"memo",
			);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(result?.data).toEqual([{ memo_id: 1, highlight_id: 101 }]);
		expect(result?.isError).toBe(true);
		await result?.refetch();
		expect(failedRetry).toHaveBeenCalledOnce();
		expect(successfulRetry).not.toHaveBeenCalled();
		await act(async () => root.unmount());
	});
});
