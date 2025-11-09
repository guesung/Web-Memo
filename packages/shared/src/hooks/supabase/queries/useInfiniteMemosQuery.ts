import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

export default function useInfiniteMemosQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.memos(),
		queryFn: async ({ pageParam }: { pageParam: number }) => {
			console.log(`[useInfiniteMemosQuery] Fetching page ${pageParam}`);
			const data = await new MemoService(supabaseClient).getMemosPaginated({
				page: pageParam,
				pageSize: PAGE_SIZE
			});
			console.log(`[useInfiniteMemosQuery] Page ${pageParam} fetched:`, data.length, 'items');
			return data;
		},
		getNextPageParam: (lastPage: GetMemoResponse[], allPages: GetMemoResponse[][]) => {
			console.log(`[useInfiniteMemosQuery] getNextPageParam - lastPage: ${lastPage.length}, totalPages: ${allPages.length}`);
			// If the last page has fewer items than PAGE_SIZE, we've reached the end
			if (lastPage.length < PAGE_SIZE) {
				console.log('[useInfiniteMemosQuery] No more pages');
				return undefined;
			}
			// Return the next page number
			const nextPage = allPages.length;
			console.log(`[useInfiniteMemosQuery] Next page: ${nextPage}`);
			return nextPage;
		},
		initialPageParam: 0,
	});
}
