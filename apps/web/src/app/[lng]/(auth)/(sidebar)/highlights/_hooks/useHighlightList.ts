import { useInfiniteQuery } from "@tanstack/react-query";
import type { HighlightColor } from "@web-memo/shared/constants";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import type { HighlightRow } from "@web-memo/shared/types";
import { HighlightService } from "@web-memo/shared/utils";
import { useMemo } from "react";

const PAGE_SIZE = 20;

/** 하이라이트 수동 더 보기 목록. memos와 같은 복합 커서를 사용한다. */
export function useHighlightList({
	searchQuery,
	color,
}: {
	searchQuery?: string;
	color?: HighlightColor;
}) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const highlightService = useMemo(
		() => new HighlightService(supabaseClient),
		[supabaseClient],
	);

	return useInfiniteQuery({
		queryKey: QUERY_KEY.highlightsPaginated({ searchQuery, color }),
		initialPageParam: undefined as { value: string; id: number } | undefined,
		queryFn: async ({ pageParam }) => {
			const { data, error } = await highlightService.getHighlightsPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				searchQuery,
				color,
			});

			if (error) {
				throw error;
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
