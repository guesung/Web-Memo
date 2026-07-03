import { useQuery } from "@tanstack/react-query";
import { getScrollPositions } from "@/lib/storage/scrollPositions";

/** 스크롤 위치 쿼리 키 (저장 시 invalidate 용) */
export const SCROLL_POSITIONS_QUERY_KEY = ["scroll-positions"];

/** URL별 읽기 스크롤 위치 맵을 조회한다 */
export function useScrollPositions() {
	return useQuery({
		queryKey: SCROLL_POSITIONS_QUERY_KEY,
		queryFn: getScrollPositions,
	});
}
