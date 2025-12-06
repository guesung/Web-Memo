import { useInfiniteQuery } from "@tanstack/react-query";
import { CommunityService } from "../../../utils/CommunityService";
import { QUERY_KEY } from "../../../constants";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 12;

export function useUserPublicMemosInfiniteQuery(userId: string) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useInfiniteQuery({
		queryKey: QUERY_KEY.userPublicMemos(userId),
		queryFn: async ({ pageParam }) => {
			if (!supabaseClient) throw new Error("Supabase client not initialized");
			const communityService = new CommunityService(supabaseClient);
			const { data, error } = await communityService.getPublicMemos({
				cursor: pageParam,
				limit: PAGE_SIZE,
				userId,
			});

			if (error) throw error;

			return {
				memos: data ?? [],
				nextCursor:
					data && data.length === PAGE_SIZE
						? data[data.length - 1].shared_at
						: undefined,
			};
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		enabled: !!userId && !!supabaseClient,
	});
}
