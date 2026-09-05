import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import { CategoryService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

export default function useCategoryPostMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new CategoryService(supabaseClient).insertCategory,
		onSuccess: () => {
			analytics.trackEvent({ name: "category_create" });
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
		},
	});
}
