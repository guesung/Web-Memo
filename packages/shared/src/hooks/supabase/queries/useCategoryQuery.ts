import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CategoryService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useCategoryQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: new CategoryService(supabaseClient).getCategories,
		queryKey: QUERY_KEY.category(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

	return {
		...query,
		categories: query.data?.data,
	};
}
