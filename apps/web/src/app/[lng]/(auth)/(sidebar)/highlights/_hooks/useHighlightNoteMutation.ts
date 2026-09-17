import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { HighlightService } from "@web-memo/shared/utils";

/** 하이라이트 코멘트를 저장한다. 저장 성공 시 목록 전체를 무효화해 최신 값으로 맞춘다. */
export function useHighlightNoteMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<void, Error, { id: number; note: string }>({
		mutationFn: async ({ id, note }) => {
			const { error } = await new HighlightService(
				supabaseClient,
			).updateHighlight({
				id,
				request: { note },
			});

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: () => {
			analytics.trackEvent({ name: "highlight_note_update" });

			/**
			 * `QUERY_KEY.highlightsPaginated(params)`는 마지막 인자로 필터 객체를 포함해
			 * 정확한 params를 모르면 값을 구성할 수 없다. prefix 매칭을 그대로 쓰기 위해
			 * 공통 접두사인 `QUERY_KEY.highlights()`로 무효화한다(`memos()`가
			 * `memosPaginated`를 같은 방식으로 무효화하는 것과 동일한 패턴).
			 */
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.highlights() });
		},
	});
}
