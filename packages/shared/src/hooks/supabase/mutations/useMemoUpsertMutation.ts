import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoRow, MemoSupabaseResponse, MemoTable } from "../../../types";
import { getPageKey, getPathKey, MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 메모 ID 또는 페이지 URL로 저장 대상을 지정한다. */
interface IFMemoUpsertVariables {
	id?: MemoRow["id"];
	url?: string;
	data: MemoTable["Insert"];
}

/** URL 후보 캐시의 변경 전 상태. */
interface IFMemoUpsertContext {
	pageKey?: string;
	isUpdate: boolean;
}

/** 명시적인 ID 또는 중복이 없는 페이지 후보에만 메모를 저장한다. */
export default function useMemoUpsertMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	return useMutation<
		MemoSupabaseResponse,
		Error,
		IFMemoUpsertVariables,
		IFMemoUpsertContext
	>({
		meta: {
			feature: "memo",
			operation: "upsert",
			stage: "save",
		},
		mutationFn: async ({ id, url, data }) => {
			const targetUrl = url ?? data.url;
			let existingMemo: MemoRow | undefined;

			if (id !== undefined) {
				const result = await memoService.getMemoById(id);
				if (result.error) {
					throw result.error;
				}
				existingMemo = result.data?.[0];
				if (!existingMemo) {
					throw new Error("선택한 메모를 찾을 수 없습니다.");
				}
				// 쿼리만 다른 주소의 메모도 후보로 고를 수 있으므로 경로 키로 비교한다. 저장해도 메모의 원래 URL은 그대로다.
				if (
					url &&
					getPathKey(existingMemo.page_key || existingMemo.url) !==
						getPathKey(url)
				) {
					throw new Error("선택한 메모가 현재 페이지에 속하지 않습니다.");
				}
			} else if (targetUrl) {
				const result = await memoService.getMemoByUrl(targetUrl);
				if (result.error) {
					throw result.error;
				}
				if ((result.data?.length ?? 0) > 1) {
					throw new Error("수정할 메모를 선택해 주세요.");
				}
				existingMemo = result.data?.[0];
			}

			const result = existingMemo
				? await memoService.updateMemo({
						id: existingMemo.id,
						request: { ...data, url: existingMemo.url },
					})
				: await memoService.insertMemo(data);
			if (result.error) {
				throw result.error;
			}

			return result;
		},
		onMutate: ({ id, url, data }) => {
			const targetUrl = url ?? data.url;
			const pageKey = targetUrl ? getPageKey(targetUrl) : undefined;
			const candidates = pageKey
				? queryClient.getQueryData<MemoSupabaseResponse>(
						QUERY_KEY.memo({ url: pageKey }),
					)?.data
				: undefined;

			return {
				pageKey,
				isUpdate: id !== undefined || candidates?.length === 1,
			};
		},
		onSuccess: async (_result, variables, context) => {
			if (context.isUpdate) {
				await analytics.trackMemoUpdate(variables.data);
			} else {
				await analytics.trackEvent({ name: "memo_first_write" });
			}

			await queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memosPaginatedPrefix(),
			});
			if (context.pageKey) {
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memo({ url: context.pageKey }),
				});
			}
			if (variables.id !== undefined) {
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memo({ id: variables.id }),
				});
			}
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEY.samePathMemosPrefix(),
			});
		},
	});
}
