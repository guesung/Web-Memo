import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoRow, MemoSupabaseResponse, MemoTable } from "../../../types";
import { MemoService, normalizeUrl } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 메모 생성 또는 수정 요청입니다. */
interface IFMemoUpsertVariables {
	id?: MemoRow["id"];
	url?: string;
	data: MemoTable["Insert"];
}

/** 낙관적 수정 이전 상태입니다. */
interface IFMemoUpsertContext {
	previousMemo: MemoSupabaseResponse | undefined;
	normalizedUrl: string | undefined;
	isUpdate: boolean;
}

/** 메모 저장 실패입니다. */
type TMutationError = Error;

/** 저장 실패를 성공으로 처리하지 않고 새 메모 입력을 보존합니다. */
const useMemoUpsertMutation = () => {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	return useMutation<
		MemoSupabaseResponse,
		TMutationError,
		IFMemoUpsertVariables,
		IFMemoUpsertContext
	>({
		mutationFn: async ({ id, url, data }) => {
			const normalizedUrl = url ? normalizeUrl(url) : undefined;

			let existingMemo: MemoRow | undefined;

			if (id) {
				const result = await memoService.getMemoById(id);
				if (result.error) {
					throw result.error;
				}
				existingMemo = result.data?.[0];
			} else if (normalizedUrl) {
				const result = await memoService.getMemoByUrl(normalizedUrl);
				if (result.error) {
					throw result.error;
				}
				existingMemo = result.data?.[0];
			}

			if (existingMemo) {
				const result = await memoService.updateMemo({
					id: existingMemo.id,
					request: data,
				});
				if (result.error) {
					throw result.error;
				}

				return result;
			}

			const result = await memoService.insertMemo(data);
			if (result.error) {
				throw result.error;
			}

			return result;
		},
		onMutate: async ({ url, data }) => {
			const normalizedUrl = url ? normalizeUrl(url) : undefined;

			if (!normalizedUrl) {
				return { previousMemo: undefined, normalizedUrl, isUpdate: false };
			}

			await queryClient.cancelQueries({
				queryKey: QUERY_KEY.memo({ url: normalizedUrl }),
			});

			const previousMemo = queryClient.getQueryData<MemoSupabaseResponse>(
				QUERY_KEY.memo({ url: normalizedUrl }),
			);

			const isUpdate = !!previousMemo?.data?.[0];
			if (!isUpdate) {
				return { previousMemo, normalizedUrl, isUpdate };
			}

			const optimisticMemo = {
				...previousMemo?.data?.[0],
				...data,
				updated_at: new Date().toISOString(),
			} as MemoRow;

			queryClient.setQueryData(QUERY_KEY.memo({ url: normalizedUrl }), {
				data: [optimisticMemo],
				error: null,
			});

			return { previousMemo, normalizedUrl, isUpdate };
		},
		onError: (_error, _variables, context) => {
			void queryClient.invalidateQueries({ queryKey: ["billing"] });
			if (context?.normalizedUrl && context?.previousMemo) {
				queryClient.setQueryData(
					QUERY_KEY.memo({ url: context.normalizedUrl }),
					context.previousMemo,
				);
			}
		},
		onSuccess: async (result, variables, context) => {
			if (context?.isUpdate) {
				await analytics.trackMemoUpdate(variables.data);
			}

			queryClient.invalidateQueries({ queryKey: ["memos", "paginated"] });

			if (!context?.isUpdate) {
				await queryClient.invalidateQueries({ queryKey: ["billing"] });
			}
			const newMemo = result.data?.[0];
			if (!newMemo || !context?.normalizedUrl) {
				return;
			}

			queryClient.setQueryData(QUERY_KEY.memo({ url: context.normalizedUrl }), {
				data: [newMemo],
				error: null,
			});
		},
	});
};

export default useMemoUpsertMutation;
