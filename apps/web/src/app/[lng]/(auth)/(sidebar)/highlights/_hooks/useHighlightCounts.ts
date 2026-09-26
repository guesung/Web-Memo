import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import {
	getPageKey,
	HighlightService,
	type IFHighlightCountByPageKeyRow,
} from "@web-memo/shared/utils";

/**
 * URL별 하이라이트 개수를 조회한다.
 * @description 조회 실패는 조용히 넘긴다. 개수는 부가 정보이고, 목록 자체는 그대로 보여야 한다.
 */
export const useHighlightCounts = (urls: string[]): Map<string, number> => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const pageKeys = urls.map(getPageKey);

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(pageKeys),
		queryFn: async () => {
			const { data: rows, error } = await new HighlightService(
				supabaseClient,
			).getHighlightCountsByPageKeys(pageKeys);

			if (error) {
				throw new Error(error.message);
			}

			return (rows ?? []) as IFHighlightCountByPageKeyRow[];
		},
		enabled: urls.length > 0,
	});

	const countsByPageKey = new Map(
		(data ?? []).map((row) => [row.page_key, row.count]),
	);

	return new Map(
		urls.map((url) => [url, countsByPageKey.get(getPageKey(url)) ?? 0]),
	);
};
