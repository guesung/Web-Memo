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
	previousMemo: MemoSupabaseResponse | undefined;
	normalizedUrl: string | undefined;
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

			const optimisticMemo: MemoRow = isUpdate
				? {
						...previousMemo.data![0],
						...data,
						updated_at: new Date().toISOString(),
					}
				: {
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
						is_public: false,
						shared_at: null,
					};

			queryClient.setQueryData(QUERY_KEY.memo({ url: normalizedUrl }), {
				data: [optimisticMemo],
				error: null,
			});

			return { previousMemo, normalizedUrl, isUpdate };
		},
		onError: (_error, _variables, context) => {
			if (context?.normalizedUrl && context?.previousMemo) {
				queryClient.setQueryData(
					QUERY_KEY.memo({ url: context.normalizedUrl }),
					context.previousMemo,
				);
			}
		},
		onSuccess: async (result, _variables, context) => {
			if (context?.isUpdate) {
				await analytics.trackMemoWrite();
			}

			queryClient.invalidateQueries({ queryKey: ["memos", "paginated"] });

			const newMemo = result.data?.[0];
			if (!newMemo || !context?.normalizedUrl) return;

			queryClient.setQueryData(QUERY_KEY.memo({ url: context.normalizedUrl }), {
				data: [newMemo],
				error: null,
			});
		},
	});
}
