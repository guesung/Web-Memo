import type { HighlightRow } from "../../types";
import type { HighlightItem } from "./types";

/**
 * Supabase의 `HighlightRow`를 렌더러가 이해하는 `HighlightItem`으로 변환한다.
 * @description 저장 직후 응답과 조회 결과를 렌더하는 경로들이 완전히 같은 필드·null 폴백을
 * 써야 한다. 앱과 확장이 각자 변환을 두면 한쪽만 고쳤을 때 서버에는 있는데 화면엔 다르게
 * 그려지는 식으로 조용히 갈라진다. `color`는 DB에서 `string`으로 오지만 CHECK 제약이
 * 하이라이트 색으로 제한하므로 단언한다.
 */
export function toHighlightItem(row: HighlightRow): HighlightItem {
	return {
		id: row.id,
		anchor: {
			exact: row.exact_text,
			prefix: row.prefix_text ?? "",
			suffix: row.suffix_text ?? "",
			textPositionStart: row.text_position_start ?? 0,
		},
		color: row.color as HighlightItem["color"],
	};
}
