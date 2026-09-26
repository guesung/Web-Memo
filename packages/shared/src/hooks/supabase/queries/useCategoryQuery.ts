import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { CategoryService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 카테고리 목록 조회의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const categoryQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions({
		queryFn: new CategoryService(supabaseClient).getCategories,
		queryKey: QUERY_KEY.category(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

export default function useCategoryQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery(categoryQueryOptions(supabaseClient));

	return {
		...query,
		categories: query.data?.data,
	};
}
