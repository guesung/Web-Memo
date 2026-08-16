import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import type { HighlightRow } from "@web-memo/shared/types";
import { HighlightService } from "@web-memo/shared/utils";
import { useMemo } from "react";

const PAGE_SIZE = 20;

/** 하이라이트 무한스크롤 목록. memos의 useMemosInfiniteQuery와 같은 복합 커서 방식을 쓴다. */
export function useHighlightList({ searchQuery }: { searchQuery?: string }) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const highlightService = useMemo(
		() => new HighlightService(supabaseClient),
		[supabaseClient],
	);

	return useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.highlightsPaginated({ searchQuery }),
		initialPageParam: undefined as { value: string; id: number } | undefined,
		queryFn: async ({ pageParam }) => {
			const { data, error } = await highlightService.getHighlightsPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				searchQuery,
			});

			if (error) {
				throw new Error(error.message);
			}

			return (data ?? []) as HighlightRow[];
		},
		getNextPageParam: (lastPage) => {
			if (lastPage.length < PAGE_SIZE) {
				return undefined;
			}

			const last = lastPage[lastPage.length - 1];

			return { value: last.created_at, id: last.id };
		},
	});
}
