import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { GetMemoResponse } from "@web-memo/shared/types";
import type { MemoPageCursor } from "@web-memo/shared/utils/services";
import { memoService } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

export function useMemosInfinite(params?: {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	searchQuery?: string;
}) {
	return useInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated({
			category: params?.category,
			isWish: params?.isWish,
			isStar: params?.isStar,
			searchQuery: params?.searchQuery,
		}),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category: params?.category,
				isWish: params?.isWish,
				isStar: params?.isStar,
				searchQuery: params?.searchQuery,
			});
			return {
				data: (result.data ?? []) as GetMemoResponse[],
				count: result.count ?? 0,
			};
		},
		initialPageParam: undefined as MemoPageCursor | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) return undefined;

			const lastMemo = lastPage.data.at(-1);
			if (!lastMemo?.updated_at) return undefined;

			return { value: lastMemo.updated_at, id: lastMemo.id };
		},
	});
}
