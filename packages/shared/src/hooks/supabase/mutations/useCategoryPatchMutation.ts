import { QUERY_KEY } from "@src/constants";
import { CategoryService } from "@src/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseClientQuery } from "../queries";

export default function useCategoryPatchMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new CategoryService(supabaseClient).updateCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
		},
	});
}
