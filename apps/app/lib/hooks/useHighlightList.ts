import { useInfiniteQuery } from "@tanstack/react-query";
import { type HighlightColor, QUERY_KEY } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import type { HighlightPageCursor } from "@web-memo/shared/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

/** 하이라이트 모아보기 목록의 필터 */
export interface HighlightListFilter {
	searchQuery?: string;
	color?: HighlightColor;
}

/**
 * 하이라이트 무한스크롤 목록. 웹 대시보드와 같은 (created_at, id) 복합 커서를 쓴다.
 * @description 하이라이트는 로그인 필수이므로 비로그인 상태에서는 조회하지 않는다.
 * 쿼리 키를 웹과 공유하므로 브라우저 탭에서 긋거나 지운 뒤 `highlights()` prefix 무효화가 그대로 먹힌다.
 */
export function useHighlightList({ searchQuery, color }: HighlightListFilter) {
	const { isLoggedIn } = useAuth();

	return useInfiniteQuery({
		queryKey: QUERY_KEY.highlightsPaginated({ searchQuery, color }),
		initialPageParam: undefined as HighlightPageCursor | undefined,
		queryFn: async ({ pageParam }) => {
			const { data, error } = await highlightService.getHighlightsPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				searchQuery,
				color,
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
		enabled: isLoggedIn,
	});
}
