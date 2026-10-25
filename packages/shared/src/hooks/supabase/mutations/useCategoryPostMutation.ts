import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import { CategoryService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

export default function useCategoryPostMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		meta: {
			feature: "category",
			operation: "create",
			stage: "save",
		},
		mutationFn: async (
			request: Parameters<CategoryService["insertCategory"]>[0],
		) => {
			const result = await new CategoryService(supabaseClient).insertCategory(
				request,
			);

			// supabase-js는 실패를 throw하지 않는다. 던지지 않으면 실패가 성공으로 처리돼 토스트가 뜨지 않는다.
			if (result.error) {
				throw result.error;
			}

			return result;
		},
		onSuccess: () => {
			analytics.trackEvent({ name: "category_create" });
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
		},
	});
}
