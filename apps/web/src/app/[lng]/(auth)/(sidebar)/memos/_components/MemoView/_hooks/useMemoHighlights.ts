import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import type { HighlightRow } from "@web-memo/shared/types";
import { HighlightService } from "@web-memo/shared/utils";

/** 현재 메모 목록의 하이라이트를 일괄 조회하고 정확한 URL별로 묶는다. */
export const useMemoHighlights = (urls: string[]) => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const uniqueUrls = [...new Set(urls.filter(Boolean))].sort();
	const { data, isError, refetch } = useQuery({
		queryKey: [...QUERY_KEY.highlights(), "byUrls", uniqueUrls],
		queryFn: async () => {
			const { data: highlights, error } = await new HighlightService(
				supabaseClient,
			).getHighlightsByUrls(uniqueUrls);
			if (error) {
				throw new Error(error.message);
			}

			return highlights ?? [];
		},
		enabled: uniqueUrls.length > 0,
	});
	const highlightsByUrl = new Map<string, HighlightRow[]>();
	for (const highlight of data ?? []) {
		const highlights = highlightsByUrl.get(highlight.url) ?? [];
		highlights.push(highlight);
		highlightsByUrl.set(highlight.url, highlights);
	}

	return {
		highlightsByUrl,
		isHighlightLoadError: isError,
		refetchHighlights: refetch,
	};
};
