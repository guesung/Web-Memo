import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { toHighlightCountMap } from "@web-memo/shared/modules/highlight";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

/**
 * URL별 하이라이트 개수를 조회한다.
 * @description 하이라이트는 로그인 필수이므로 비로그인 상태에서는 조회하지 않는다.
 * 조회 실패는 조용히 넘긴다 — 개수는 부가 정보이고 메모 목록 자체는 그대로 보여야 한다.
 */
export function useHighlightCounts(urls: string[]): Map<string, number> {
	const { isLoggedIn } = useAuth();

	const { data } = useQuery({
		queryKey: QUERY_KEY.highlightCounts(urls),
		queryFn: async () => {
			const { data: rows, error } = await highlightService.getHighlightCounts(urls);

			if (error) {
				throw new Error(error.message);
			}

			return rows ?? [];
		},
		enabled: isLoggedIn && urls.length > 0,
	});

	return useMemo(() => toHighlightCountMap(data ?? []), [data]);
}
