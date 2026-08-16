import type { HighlightCountRow } from "../../utils/supabase/highlightService";

/**
 * RPC가 돌려준 개수 행을 url → count 맵으로 바꾼다.
 * @description RPC는 개수가 0인 url을 반환하지 않으므로, 조회 결과에 없는 url은
 * 맵에도 없다. 호출 측은 `map.get(url) ?? 0` 형태로 0을 채워야 한다.
 */
export function toHighlightCountMap(
	rows: HighlightCountRow[],
): Map<string, number> {
	return new Map(rows.map((row) => [row.url, row.count]));
}
