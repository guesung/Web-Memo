import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type IFMemosInfiniteQueryParams,
	memosInfiniteQueryOptions,
} from "../../../utils/supabase/memosInfiniteQueryOptions";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 필터별 메모를 조회하고 날짜와 id로 다음 페이지를 이어 읽는다. */
const useMemosInfiniteQuery = (params: IFMemosInfiniteQueryParams = {}) => {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseInfiniteQuery(
		memosInfiniteQueryOptions(supabaseClient, params),
	);

	const memos = query.data?.pages.flatMap((page) => page.data);
	const totalCount = query.data?.pages[0]?.count ?? 0;

	return {
		...query,
		memos,
		totalCount,
	};
};

export default useMemosInfiniteQuery;
