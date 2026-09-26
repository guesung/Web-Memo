import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import type { HighlightRow } from "@web-memo/shared/types";
import { getPageKey, HighlightService } from "@web-memo/shared/utils";

/** 현재 메모 목록의 하이라이트를 페이지 식별값별로 조회하고 각 메모 URL에 연결한다. */
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
	const highlightsByPageKey = new Map<string, HighlightRow[]>();
	for (const highlight of data ?? []) {
		const pageKey = highlight.page_key || getPageKey(highlight.url);
		const highlights = highlightsByPageKey.get(pageKey) ?? [];
		highlights.push(highlight);
		highlightsByPageKey.set(pageKey, highlights);
	}
	const highlightsByUrl = new Map<string, HighlightRow[]>();
	for (const url of uniqueUrls) {
		try {
			highlightsByUrl.set(url, highlightsByPageKey.get(getPageKey(url)) ?? []);
		} catch {
			highlightsByUrl.set(url, []);
		}
	}

	return {
		highlightsByUrl,
		isHighlightLoadError: isError,
		refetchHighlights: refetch,
	};
};
