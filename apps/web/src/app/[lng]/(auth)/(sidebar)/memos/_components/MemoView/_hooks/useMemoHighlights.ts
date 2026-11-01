import { useQueries } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useStableBatches,
	useSupabaseClientQuery,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import type { HighlightRow } from "@web-memo/shared/types";
import { getPageKey, HighlightService } from "@web-memo/shared/utils";

/** 현재 메모 목록의 하이라이트를 페이지 식별값별로 조회하고 각 메모 URL에 연결한다. */
export const useMemoHighlights = (urls: string[]) => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;
	const uniqueUrls = [...new Set(urls.filter(Boolean))].sort();
	const pageKeys = [
		...new Set(
			uniqueUrls.map((url) => {
				try {
					return getPageKey(url);
				} catch {
					return url;
				}
			}),
		),
	];
	const batches = useStableBatches(pageKeys, userId);
	const queries = useQueries({
		queries: batches.map((batch) => ({
			queryKey: [...QUERY_KEY.highlights(), "byUrls", userId, batch],
			queryFn: async () => {
				const { data: highlights, error } = await new HighlightService(
					supabaseClient,
				).getHighlightsByUrls(batch);
				if (error) throw error;
				return highlights ?? [];
			},
			enabled: !!userId,
		})),
	});
	const highlightsByPageKey = new Map<string, HighlightRow[]>();
	const seenHighlightIds = new Set<number>();
	for (const highlight of queries.flatMap((query) => query.data ?? [])) {
		if (seenHighlightIds.has(highlight.id)) continue;
		seenHighlightIds.add(highlight.id);
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
	const hasLoadError = queries.some((query) => query.isError);

	return {
		highlightsByUrl,
		isHighlightLoadError: hasLoadError,
		refetchHighlights: async () =>
			Promise.all(
				queries
					.filter((query) => !hasLoadError || query.isError)
					.map((query) => query.refetch()),
			),
	};
};
