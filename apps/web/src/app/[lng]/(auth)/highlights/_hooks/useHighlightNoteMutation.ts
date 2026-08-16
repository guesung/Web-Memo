import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { HighlightService } from "@web-memo/shared/utils";

/** 하이라이트 코멘트를 저장한다. 저장 성공 시 목록 전체를 무효화해 최신 값으로 맞춘다. */
export function useHighlightNoteMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<void, Error, { id: number; note: string }>({
		mutationFn: async ({ id, note }) => {
			const { error } = await new HighlightService(supabaseClient).updateHighlight({
				id,
				request: { note },
			});

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["highlights", "paginated"] });
		},
	});
}
