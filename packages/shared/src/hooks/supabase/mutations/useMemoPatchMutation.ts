import {
	type InfiniteData,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import {
	MEMO_STATUS_KEYS,
	QUERY_KEY,
	type TMemoStatusKey,
} from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { TCategoryChangeSource } from "../../../modules/analytics/type";
import type { GetMemoResponse, MemoRow, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	id: MemoRow["id"];
	request: MemoTable["Update"];
	/** 카테고리를 바꾼 경로. memo_category_change 이벤트의 source로 실립니다 */
	categorySource?: TCategoryChangeSource;
};
type MutationData = Awaited<ReturnType<MemoService["updateMemo"]>>;
type MutationError = Error;

/** 메모 목록 한 페이지의 캐시 모양. */
interface IFMemosPageData {
	data: GetMemoResponse[];
	count: number;
}
type TMemosListSnapshot = [
	queryKey: readonly unknown[],
	data: InfiniteData<IFMemosPageData> | undefined,
][];
/** onMutate가 롤백용으로 넘기는 목록 캐시 스냅샷. 상태 필드를 건드리지 않는 요청에는 없다. */
interface IFMutationContext {
	listSnapshot?: TMemosListSnapshot;
}

export default function useMemoPatchMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<
		MutationData,
		MutationError,
		MutationVariables,
		IFMutationContext
	>({
		meta: {
			feature: "memo",
			operation: "patch",
			stage: "save",
		},
		mutationFn: async (variables) => {
			const result = await new MemoService(supabaseClient).updateMemo(
				variables,
			);

			// supabase-js는 실패를 throw하지 않고 error로 돌려준다. 던지지 않으면 onError·토스트·호출부 롤백이 모두 건너뛰고 성공 이벤트까지 나간다.
			if (result.error) {
				throw result.error;
			}

			return result;
		},
		/**
		 * 위시·중요·읽는 중을 바꾸는 요청이면 응답 전에 메모 목록 캐시의 해당 필드를 먼저 바꾼다.
		 * @description 그 밖의 필드(본문·카테고리 등)는 목록의 모양과 달라 건드리지 않고 성공 뒤 재조회에 맡긴다.
		 */
		onMutate: async ({ id, request }) => {
			const statusPatch: Partial<Record<TMemoStatusKey, boolean>> = {};
			for (const statusKey of MEMO_STATUS_KEYS) {
				const statusValue = request[statusKey];
				if (statusValue !== undefined && statusValue !== null) {
					statusPatch[statusKey] = statusValue;
				}
			}
			if (Object.keys(statusPatch).length === 0) {
				return {};
			}

			// 진행 중인 재조회가 낙관적 값을 옛 응답으로 덮어쓰지 않게 먼저 멈춘다.
			await queryClient.cancelQueries({
				queryKey: QUERY_KEY.memosPaginatedPrefix(),
			});
			const listSnapshot = queryClient.getQueriesData<
				InfiniteData<IFMemosPageData>
			>({ queryKey: QUERY_KEY.memosPaginatedPrefix() });

			queryClient.setQueriesData<InfiniteData<IFMemosPageData>>(
				{ queryKey: QUERY_KEY.memosPaginatedPrefix() },
				(cachedList) => {
					if (!cachedList) return cachedList;

					return {
						...cachedList,
						pages: cachedList.pages.map((page) => ({
							...page,
							data: page.data.map((memo) =>
								memo.id === id ? { ...memo, ...statusPatch } : memo,
							),
						})),
					};
				},
			);

			return { listSnapshot };
		},
		onError: (_error, _variables, context) => {
			for (const [queryKey, cachedList] of context?.listSnapshot ?? []) {
				queryClient.setQueryData(queryKey, cachedList);
			}
		},
		onSuccess: async (_, { request, categorySource }) => {
			await analytics.trackMemoUpdate(request, { categorySource });
			queryClient.invalidateQueries({
				queryKey: ["memo"],
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memos(),
			});
		},
	});
}
