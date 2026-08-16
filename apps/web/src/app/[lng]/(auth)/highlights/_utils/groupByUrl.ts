import type { HighlightRow } from "@web-memo/shared/types";

/** 한 페이지에서 그은 하이라이트 묶음 */
export interface HighlightGroup {
	url: string;
	title: string | null;
	favIconUrl: string | null;
	highlights: HighlightRow[];
}

/** 하이라이트를 URL별로 묶는다. 입력 순서가 그룹 순서가 된다. */
export function groupHighlightsByUrl(rows: HighlightRow[]): HighlightGroup[] {
	const groups = new Map<string, HighlightGroup>();

	for (const row of rows) {
		const existing = groups.get(row.url);

		if (existing) {
			existing.highlights.push(row);
			continue;
		}

		groups.set(row.url, {
			url: row.url,
			title: row.title,
			favIconUrl: row.favIconUrl,
			highlights: [row],
		});
	}

	return [...groups.values()];
}
