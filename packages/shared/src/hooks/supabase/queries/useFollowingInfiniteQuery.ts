import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { FollowUser } from "../../../types";
import { FollowService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 50;

export default function useFollowingInfiniteQuery(userId: string) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useInfiniteQuery<FollowUser[]>({
		queryKey: QUERY_KEY.following(userId),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await new FollowService(
				supabaseClient,
			).getFollowing({
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
			return lastPage[lastPage.length - 1]?.followed_at;
		},
		enabled: !!supabaseClient && !!userId,
	});
}
