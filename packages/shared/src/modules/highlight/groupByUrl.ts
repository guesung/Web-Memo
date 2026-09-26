import type { HighlightRow } from "../../types";
import { getPageKey } from "../../utils/Url";

/** 한 페이지에서 그은 하이라이트 묶음 */
export interface HighlightGroup {
	url: string;
	title: string | null;
	favIconUrl: string | null;
	highlights: HighlightRow[];
}

/** 하이라이트를 페이지 식별값별로 묶는다. 입력 순서가 그룹 순서가 된다. */
export const groupHighlightsByUrl = (
	rows: HighlightRow[],
): HighlightGroup[] => {
	const groups = new Map<string, HighlightGroup>();

	for (const row of rows) {
		const pageKey = row.page_key || getPageKey(row.url);
		const existing = groups.get(pageKey);

		if (existing) {
			existing.highlights.push(row);
			continue;
		}

		groups.set(pageKey, {
			url: row.url,
			title: row.title,
			favIconUrl: row.favIconUrl,
			highlights: [row],
		});
	}

	return [...groups.values()];
};
