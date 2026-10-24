import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import type { IFBlogSyncRequestResult, TBlogId } from "../../types/blogReading";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import { requestBlogSync } from "../../utils/supabase/blogReadingService";

/**
 * 멈춘 수집의 재개를 요청한다('수집 재개').
 * @description 결과 `status`로 문구를 고른다: `queued` 요청 접수, `running` 이미 수집 중, `throttled` 15분 안에 이미 요청함(`nextRequestAt`).
 * 성공하면 요약과 목록을 다시 검증해 `resumeQueued`를 반영한다. 목록은 무효화만 하므로 읽던 스냅샷은 유지된다.
 */
export const useBlogSyncRequestMutation = (params: {
	supabaseClient: MemoSupabaseClient;
	userId: string | null | undefined;
}) => {
	const queryClient = useQueryClient();

	return useMutation<IFBlogSyncRequestResult, Error, { blogId: TBlogId }>({
		meta: {
			feature: "blogReading",
			operation: "syncRequest",
			stage: "request",
		},
		mutationFn: (variables) =>
			requestBlogSync({
				supabaseClient: params.supabaseClient,
				blogId: variables.blogId,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEY.blogCompletion(params.userId ?? ""),
			});
		},
	});
};
