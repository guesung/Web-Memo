import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { BookmarkedMemo } from "../../../types";
import { BookmarkService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

export default function useBookmarkedMemosInfiniteQuery(userId: string) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useInfiniteQuery<BookmarkedMemo[]>({
		queryKey: QUERY_KEY.bookmarkedMemos(userId),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await new BookmarkService(
				supabaseClient,
			).getBookmarkedMemos({
				userId,
				cursor: pageParam as string | undefined,
				limit: PAGE_SIZE,
			});

			if (error) throw error;
			return data ?? [];
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < PAGE_SIZE) return undefined;
			return lastPage[lastPage.length - 1]?.bookmarked_at;
		},
		enabled: !!supabaseClient && !!userId,
	});
}
