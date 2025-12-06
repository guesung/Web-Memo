import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoComment } from "../../../types";
import { CommentService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 50;

export default function useMemoCommentsInfiniteQuery(memoId: number) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useInfiniteQuery<MemoComment[]>({
		queryKey: QUERY_KEY.memoComments(memoId),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await new CommentService(
				supabaseClient,
			).getComments({
				memoId,
				cursor: pageParam as string | undefined,
				limit: PAGE_SIZE,
			});

			if (error) throw error;
			return data ?? [];
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < PAGE_SIZE) return undefined;
			return lastPage[lastPage.length - 1]?.created_at;
		},
		enabled: !!supabaseClient && memoId > 0,
	});
}
