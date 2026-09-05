import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import { CategoryService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

export default function useCategoryUpdateMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new CategoryService(supabaseClient).updateCategory,
		onSuccess: () => {
			analytics.trackEvent({ name: "category_update" });
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
		},
	});
}
