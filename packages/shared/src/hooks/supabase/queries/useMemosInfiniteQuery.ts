import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

interface UseMemosInfiniteQueryProps {
	category?: string;
	isWish?: boolean;
	searchQuery?: string;
}

export default function useMemosInfiniteQuery({
	category,
	isWish = false,
	searchQuery,
}: UseMemosInfiniteQueryProps = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	const query = useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated(category, isWish, searchQuery),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category,
				isWish,
				searchQuery,
			});

			return {
				data: (result.data ?? []) as GetMemoResponse[],
				count: result.count ?? 0,
			};
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) {
				return undefined;
			}
			const lastMemo = lastPage.data.at(-1);
			return lastMemo?.updated_at ?? undefined;
		},
	});

	const memos = query.data?.pages.flatMap((page) => page.data) ?? [];
	const totalCount = query.data?.pages[0]?.count ?? 0;

	return {
		...query,
		memos,
		totalCount,
	};
}
