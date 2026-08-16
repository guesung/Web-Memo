import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

/**
 * 페이지 하나의 하이라이트를 조회한다. WebView 복원에 쓴다.
 * @description 하이라이트는 로그인 필수이므로 비로그인 상태에서는 조회하지 않는다.
 * 호출 측이 이미 정규화한 url을 넘겨야 한다(정규화는 caller 책임).
 */
export function useHighlightsByUrl(url: string) {
	const { isLoggedIn } = useAuth();

	return useQuery<HighlightRow[]>({
		queryKey: QUERY_KEY.highlightsByUrl(url),
		queryFn: async () => {
			const { data, error } = await highlightService.getHighlightsByUrl(url);

			if (error) {
				throw new Error(error.message);
			}

			return data ?? [];
		},
		enabled: isLoggedIn && url.length > 0,
	});
}
