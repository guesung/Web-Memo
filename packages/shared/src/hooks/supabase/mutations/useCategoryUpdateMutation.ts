import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CategoryService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

export default function useCategoryUpdateMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new CategoryService(supabaseClient).updateCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
		},
	});
}
