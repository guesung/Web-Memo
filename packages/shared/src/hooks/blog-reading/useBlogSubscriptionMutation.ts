import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import type {
	IFBlogSubscriptionResult,
	TBlogId,
} from "../../types/blogReading";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import { setBlogSubscription } from "../../utils/supabase/blogReadingService";

/** 구독 변경 입력 */
export interface IFBlogSubscriptionVariables {
	blogId: TBlogId;
	/** true면 구독, false면 해제 */
	active: boolean;
}

/**
 * 블로그를 구독하거나 해제한다.
 * @description 낙관적 갱신을 하지 않으므로 실패하면 이전 상태가 그대로 남는다(화면은 오류로 Toast만 띄운다).
 * 성공하면 목록 범위가 바뀌므로 목록 스냅샷을 모두 새로 잡고(resetQueries) 요약을 다시 읽는다.
 * 해제해도 메모·카탈로그는 보존되며, 재구독하면 기존 완료가 그대로 보인다.
 */
export const useBlogSubscriptionMutation = (params: {
	supabaseClient: MemoSupabaseClient;
	userId: string | null | undefined;
}) => {
	const queryClient = useQueryClient();
	const userId = params.userId ?? "";

	return useMutation<
		IFBlogSubscriptionResult,
		Error,
		IFBlogSubscriptionVariables
	>({
		meta: {
			feature: "blogReading",
			operation: "subscription",
			stage: "save",
		},
		mutationFn: (variables) =>
			setBlogSubscription({
				supabaseClient: params.supabaseClient,
				blogId: variables.blogId,
				active: variables.active,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.resetQueries({
					queryKey: QUERY_KEY.blogReadingPages(userId),
				}),
				queryClient.invalidateQueries({
					queryKey: QUERY_KEY.blogReadingSummary(userId),
				}),
			]);
		},
	});
};
