import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { PublicMemo } from "../../../types";
import { CommunityService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

interface UseCommunityMemosInfiniteQueryProps {
	userId?: string;
}

export default function useCommunityMemosInfiniteQuery({
	userId,
}: UseCommunityMemosInfiniteQueryProps = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const communityService = new CommunityService(supabaseClient);

	const query = useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.communityMemos(userId),
		queryFn: async ({ pageParam }) => {
			const result = await communityService.getPublicMemos({
				cursor: pageParam,
				limit: PAGE_SIZE,
				userId,
			});

			return {
				data: (result.data ?? []) as PublicMemo[],
			};
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) {
				return undefined;
			}
			const lastMemo = lastPage.data.at(-1);
			return lastMemo?.shared_at ?? undefined;
		},
	});

	const memos = query.data?.pages.flatMap((page) => page.data);

	return {
		...query,
		memos,
	};
}
