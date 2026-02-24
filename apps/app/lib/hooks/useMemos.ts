import { useInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { MemoService } from "@web-memo/shared/utils/services";
import { supabase } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

const memoService = new MemoService(supabase);

export function useMemosInfinite(params?: {
	category?: string;
	isWish?: boolean;
	searchQuery?: string;
}) {
	return useInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated(
			params?.category,
			params?.isWish,
			params?.searchQuery,
		),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category: params?.category,
				isWish: params?.isWish,
				searchQuery: params?.searchQuery,
			});
			return {
				data: (result.data ?? []) as GetMemoResponse[],
				count: result.count ?? 0,
			};
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) return undefined;
			return lastPage.data.at(-1)?.updated_at ?? undefined;
		},
	});
}
