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
		meta: {
			feature: "memo",
			operation: "upsert",
			stage: "save",
		},
		mutationFn: async ({ id, url, data }) => {
			const normalizedUrl = url ? normalizeUrl(url) : undefined;

			let existingMemo: MemoRow | undefined;

			// supabase-js는 실패를 throw하지 않고 error로 돌려준다. 던지지 않으면 조회 오류가
			// "기존 메모 없음"으로 오독되어 insert로 떨어지고, 성공 이벤트까지 나가며 중복이 생긴다.
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

			const optimisticMemo: MemoRow = isUpdate
				? ({
						...previousMemo.data?.[0],
						...data,
						updated_at: new Date().toISOString(),
					} as MemoRow)
				: {
						actionItem: data.actionItem ?? null,
						category_id: data.category_id ?? null,
						created_at: new Date().toISOString(),
						deleted_at: null,
						favIconUrl: data.favIconUrl ?? null,
						id: -Date.now(),
						impression: data.impression ?? null,
						isReading: data.isReading ?? false,
						isStar: data.isStar ?? false,
						isWish: data.isWish ?? false,
						memo: data.memo ?? "",
						title: data.title ?? "",
						updated_at: new Date().toISOString(),
						url: data.url ?? "",
						user_id: "",
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
		onSuccess: async (result, variables, context) => {
			if (context?.isUpdate) {
				await analytics.trackMemoUpdate(variables.data);
			} else {
				await analytics.trackEvent({ name: "memo_first_write" });
			}

			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memosPaginatedPrefix(),
			});

			const newMemo = result.data?.[0];
			if (!newMemo || !context?.normalizedUrl) return;

			queryClient.setQueryData(QUERY_KEY.memo({ url: context.normalizedUrl }), {
				data: [newMemo],
				error: null,
			});
		},
	});
}
