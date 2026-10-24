import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../../constants";
import useMemoPatchMutation from "./useMemoPatchMutation";

const { getQueryClient, updateMemo } = vi.hoisted(() => ({
	getQueryClient: vi.fn(),
	updateMemo: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();

	return {
		...actual,
		useQueryClient: getQueryClient,
		useMutation: (options: unknown) => options,
	};
});
vi.mock("../queries", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
}));
vi.mock("../../../modules/analytics", () => ({
	analytics: { trackMemoUpdate: vi.fn(async () => {}) },
}));
vi.mock("../../../utils", () => ({
	MemoService: class {
		updateMemo = updateMemo;
	},
}));

const createListCache = () => ({
	pages: [
		{
			data: [
				{ id: 1, title: "첫 메모", isWish: false, isStar: false },
				{ id: 2, title: "둘째 메모", isWish: false, isStar: false },
			],
			count: 2,
		},
	],
	pageParams: [undefined],
});

describe("메모 상태 패치의 낙관적 업데이트", () => {
	let queryClient: QueryClient;
	const listKey = QUERY_KEY.memosPaginated();

	const createMutation = () =>
		new MutationObserver(
			queryClient,
			useMemoPatchMutation() as unknown as ConstructorParameters<
				typeof MutationObserver
			>[1],
		);
	const readIsWish = (memoId: number) =>
		queryClient
			.getQueryData<ReturnType<typeof createListCache>>(listKey)
			?.pages[0].data.find((memo) => memo.id === memoId)?.isWish;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient();
		getQueryClient.mockReturnValue(queryClient);
		queryClient.setQueryData(listKey, createListCache());
	});

	it("서버 응답을 기다리는 동안 목록 캐시의 해당 메모 상태만 바꾼다", async () => {
		let resolveUpdate: (value: unknown) => void = () => {};
		updateMemo.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveUpdate = resolve;
			}),
		);
		const mutation = createMutation();

		const pending = mutation.mutate({ id: 1, request: { isWish: true } });
		await vi.waitFor(() => expect(readIsWish(1)).toBe(true));
		expect(readIsWish(2)).toBe(false);

		resolveUpdate({ data: [], error: null });
		await pending;
		expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
	});

	it("저장이 실패하면 목록 캐시를 요청 전 값으로 되돌린다", async () => {
		updateMemo.mockResolvedValueOnce({
			data: null,
			error: new Error("저장 실패"),
		});
		const mutation = createMutation();

		await expect(
			mutation.mutate({ id: 1, request: { isWish: true } }),
		).rejects.toThrow("저장 실패");

		expect(readIsWish(1)).toBe(false);
		expect(queryClient.getQueryData(listKey)).toEqual(createListCache());
	});

	it("상태 필드가 없는 요청은 목록 캐시를 건드리지 않는다", async () => {
		updateMemo.mockResolvedValueOnce({ data: [], error: null });
		const cachedBefore = queryClient.getQueryData(listKey);
		const options = useMemoPatchMutation() as unknown as {
			onMutate: (variables: unknown) => Promise<unknown>;
		};

		const context = await options.onMutate({
			id: 1,
			request: { title: "새 제목" },
		});

		expect(context).toEqual({});
		expect(queryClient.getQueryData(listKey)).toBe(cachedBefore);
	});
});
