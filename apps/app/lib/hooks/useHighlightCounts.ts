import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { IFHighlightCountByPageKeyRow } from "@web-memo/shared/utils/services";
import { getPageKey } from "@web-memo/shared/utils/url";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

/** 페이지 식별값별 개수를 조회하고 호출자의 원본 URL로 다시 매핑한다. */
export function useHighlightCounts(urls: string[]): Map<string, number> {
	const { isLoggedIn } = useAuth();
	const pageKeys = Array.from(new Set(urls.map(getPageKey)));

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(pageKeys),
		queryFn: async () => {
			const { data: rows, error } =
				await highlightService.getHighlightCountsByPageKeys(pageKeys);
			if (error) {
				throw new Error(error.message);
			}

			return (rows ?? []) as IFHighlightCountByPageKeyRow[];
		},
		enabled: isLoggedIn && pageKeys.length > 0,
	});

	const countsByPageKey = new Map(
		(data ?? []).map((row) => [row.page_key, Number(row.count)]),
	);
	return new Map(
		urls.map((url) => [url, countsByPageKey.get(getPageKey(url)) ?? 0]),
	);
}
