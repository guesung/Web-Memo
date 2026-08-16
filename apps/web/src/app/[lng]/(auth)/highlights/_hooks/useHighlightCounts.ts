import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { toHighlightCountMap } from "@web-memo/shared/modules/highlight";
import { HighlightService } from "@web-memo/shared/utils";
import { useMemo } from "react";

/**
 * URL별 하이라이트 개수를 조회한다.
 * @description 조회 실패는 조용히 넘긴다. 개수는 부가 정보이고, 목록 자체는 그대로 보여야 한다.
 */
export function useHighlightCounts(urls: string[]): Map<string, number> {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const highlightService = useMemo(
		() => new HighlightService(supabaseClient),
		[supabaseClient],
	);

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(urls),
		queryFn: async () => {
			const { data: rows, error } = await highlightService.getHighlightCounts(urls);

			if (error) {
				throw new Error(error.message);
			}

			return rows ?? [];
		},
		enabled: urls.length > 0,
	});

	return useMemo(() => toHighlightCountMap(data ?? []), [data]);
}
