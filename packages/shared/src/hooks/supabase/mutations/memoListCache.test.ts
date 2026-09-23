import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY } from "../../../constants";
import useMemoPostMutation from "./useMemoPostMutation";
import useMemosUpsertMutation from "./useMemosUpsertMutation";

const { getQueryClient, insertMemo, upsertMemos } = vi.hoisted(() => ({
	getQueryClient: vi.fn(),
	insertMemo: vi.fn(),
	upsertMemos: vi.fn(),
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
vi.mock("../../../utils", () => ({
	MemoService: class {
		insertMemo = insertMemo;
		upsertMemos = upsertMemos;
	},
}));

describe("메모 저장 뒤 실제 목록 캐시 갱신", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient();
		getQueryClient.mockReturnValue(queryClient);
		insertMemo.mockResolvedValue({ data: [{ id: 1 }], error: null });
		upsertMemos.mockResolvedValue({ data: [{ id: 1 }], error: null });
	});

	it.each([
		["생성", useMemoPostMutation, {}],
		["일괄 저장", useMemosUpsertMutation, []],
	] as const)(
		"%s 시 단일 목록 캐시 없이도 저장하고 필터별 목록을 무효화한다",
		async (_label, useMutationOptions, request) => {
			const listKeys = [
				QUERY_KEY.memosPaginated(),
				QUERY_KEY.memosPaginated("업무", true, "검색", "title"),
			];
			const cachedPage = {
				pages: [{ data: [], count: 0 }],
				pageParams: [undefined],
			};
			for (const queryKey of listKeys) {
				queryClient.setQueryData(queryKey, cachedPage);
			}
			queryClient.setQueryData(QUERY_KEY.setting(), { theme: "dark" });
			/** 훅의 옵션을 실제 MutationObserver에 넘겨 onMutate와 성공 콜백을 실행한다. */
			const options = useMutationOptions() as unknown as ConstructorParameters<
				typeof MutationObserver
			>[1];
			const mutation = new MutationObserver(queryClient, options);

			await mutation.mutate(request);

			expect(mutation.getCurrentResult().status).toBe("success");
			expect(queryClient.getQueryData(QUERY_KEY.memos())).toBeUndefined();
			for (const queryKey of listKeys) {
				expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
				expect(queryClient.getQueryData(queryKey)).toEqual(cachedPage);
			}
			expect(
				queryClient.getQueryState(QUERY_KEY.setting())?.isInvalidated,
			).toBe(false);
		},
	);

	it("일괄 저장 요청이 실패하면 기존 목록 데이터를 보존한다", async () => {
		const queryKey = QUERY_KEY.memosPaginated();
		const cachedPage = {
			pages: [{ data: [{ id: 1, title: "기존" }], count: 1 }],
			pageParams: [undefined],
		};
		queryClient.setQueryData(queryKey, cachedPage);
		upsertMemos.mockRejectedValueOnce(new Error("저장 실패"));
		const options =
			useMemosUpsertMutation() as unknown as ConstructorParameters<
				typeof MutationObserver
			>[1];
		const mutation = new MutationObserver(queryClient, options);

		await expect(mutation.mutate([])).rejects.toThrow("저장 실패");

		expect(queryClient.getQueryData(queryKey)).toEqual(cachedPage);
	});

	it("메모 생성이 Supabase 오류를 반환하면 성공으로 처리하지 않는다", async () => {
		const queryKey = QUERY_KEY.memosPaginated();
		const cachedPage = {
			pages: [{ data: [{ id: 1, title: "기존" }], count: 1 }],
			pageParams: [undefined],
		};
		queryClient.setQueryData(queryKey, cachedPage);
		insertMemo.mockResolvedValueOnce({
			data: null,
			error: new Error("저장 실패"),
		});
		const options = useMemoPostMutation() as unknown as ConstructorParameters<
			typeof MutationObserver
		>[1];
		const mutation = new MutationObserver(queryClient, options);

		await expect(mutation.mutate({})).rejects.toThrow("저장 실패");

		expect(mutation.getCurrentResult().status).toBe("error");
		expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
		expect(queryClient.getQueryData(queryKey)).toEqual(cachedPage);
	});
});
