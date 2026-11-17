import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { HighlightRow } from "@web-memo/shared/types";
import { HighlightService } from "@web-memo/shared/utils";

type TDeleteTarget = Pick<HighlightRow, "id" | "url" | "user_id">;

/**
 * 하이라이트 한 문장을 삭제한다. 응답을 받은 뒤 목록 전체를 무효화해 항목을 지운다.
 * RLS나 범위 불일치로 지워진 행이 없으면 성공 응답이어도 실패로 취급한다.
 */
export function useHighlightDeleteMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<void, Error, TDeleteTarget>({
		meta: {
			feature: "highlight",
			operation: "delete",
			stage: "save",
		},
		mutationFn: async ({ id, url, user_id }) => {
			const { data, error } = await new HighlightService(
				supabaseClient,
			).deleteHighlight(id, user_id ? { url, userId: user_id } : undefined);

			if (error) {
				throw new Error(error.message);
			}
			if (!data?.length) {
				throw new Error("삭제된 하이라이트가 없습니다.");
			}
		},
		onSuccess: () => {
			analytics.trackEvent({
				name: "highlight_delete",
				params: { source: "web_list" },
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.highlights() });
		},
	});
}
