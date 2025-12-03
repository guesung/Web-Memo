import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoRow, MemoSupabaseResponse, MemoTable } from "../../../types";
import { MemoService, normalizeUrl } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

interface MemoUpsertVariables {
	id?: MemoRow["id"];
	url?: string;
	data: MemoTable["Insert"];
}

interface MemoUpsertContext {
	previousMemos: MemoSupabaseResponse | undefined;
	isUpdate: boolean;
}

type MutationError = Error;

export default function useMemoUpsertMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	return useMutation<
		MemoSupabaseResponse,
		MutationError,
		MemoUpsertVariables,
		MemoUpsertContext
	>({
		mutationFn: async ({ id, url, data }) => {
			const normalizedUrl = url ? normalizeUrl(url) : undefined;

			let existingMemo: MemoRow | undefined;

			if (id) {
				const result = await memoService.getMemoById(id);
				existingMemo = result.data?.[0];
			} else if (normalizedUrl) {
				const result = await memoService.getMemoByUrl(normalizedUrl);
				existingMemo = result.data?.[0];
			}

			if (existingMemo) {
				return memoService.updateMemo({ id: existingMemo.id, request: data });
			}

			return memoService.insertMemo(data);
		},
		onMutate: async ({ id, url, data }) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });

			const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
				QUERY_KEY.memos(),
			);

			if (!previousMemos?.data) {
				return { previousMemos, isUpdate: false };
			}

			const normalizedUrl = url ? normalizeUrl(url) : undefined;

			const existingMemoIndex = previousMemos.data.findIndex(
				(memo) => memo.id === id || (normalizedUrl && memo.url === normalizedUrl),
			);

			const isUpdate = existingMemoIndex !== -1;
			const updatedMemosData = [...previousMemos.data];

			if (isUpdate) {
				const existingMemo = updatedMemosData[existingMemoIndex];
				updatedMemosData.splice(existingMemoIndex, 1, {
					...existingMemo,
					...data,
					updated_at: new Date().toISOString(),
				});
			} else {
				const optimisticMemo: MemoRow = {
					id: -Date.now(),
					user_id: "",
					url: data.url ?? "",
					title: data.title ?? "",
					memo: data.memo ?? "",
					favIconUrl: data.favIconUrl ?? null,
					isWish: data.isWish ?? false,
					category_id: data.category_id ?? null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
				updatedMemosData.unshift(optimisticMemo);
			}

			await queryClient.setQueryData(QUERY_KEY.memos(), {
				...previousMemos,
				data: updatedMemosData,
			});

			return { previousMemos, isUpdate };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousMemos) {
				queryClient.setQueryData(QUERY_KEY.memos(), context.previousMemos);
			}
		},
		onSuccess: async (result, { url }, context) => {
			if (context?.isUpdate) {
				await analytics.trackMemoWrite();
			}

			queryClient.invalidateQueries({ queryKey: ["memos", "paginated"] });

			if (url) {
				const normalizedUrl = normalizeUrl(url);
				queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memo({ url: normalizedUrl }),
				});
			}

			if (!context?.isUpdate && result.data) {
				const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
					QUERY_KEY.memos(),
				);

				if (previousMemos?.data) {
					const updatedData = previousMemos.data.map((memo) =>
						memo.id < 0 ? { ...result.data![0], ...memo, id: result.data![0].id } : memo,
					);

					queryClient.setQueryData(QUERY_KEY.memos(), {
						...previousMemos,
						data: updatedData,
					});
				}
			}
		},
	});
}
