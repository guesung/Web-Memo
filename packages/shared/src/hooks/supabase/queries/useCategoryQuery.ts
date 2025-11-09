import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CategoryService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useCategoryQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: new CategoryService(supabaseClient).getCategories,
		queryKey: QUERY_KEY.category(),
	});

	return {
		...query,
		categories: query.data?.data,
	};
}
