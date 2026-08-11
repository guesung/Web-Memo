/** 메모 검색 범위. all은 제목·본문 전체, title은 제목만, memo는 본문 계열(메모·느낀 점·액션 아이템)만 찾는다. */
export type MemoSearchTarget = "all" | "title" | "memo";

const SEARCH_COLUMNS: Record<MemoSearchTarget, string[]> = {
	all: ["title", "memo", "impression", "actionItem"],
	title: ["title"],
	memo: ["memo", "impression", "actionItem"],
};

/**
 * 메모 검색(searchQuery)을 Supabase `.or()` 필터 문자열로 변환한다.
 * searchTarget에 해당하는 컬럼들을 부분 일치(ilike)로 검색한다.
 */
export function getMemoSearchFilter(
	searchQuery: string,
	searchTarget: MemoSearchTarget = "all",
): string {
	const pattern = `%${searchQuery}%`;
	const columns = SEARCH_COLUMNS[searchTarget] ?? SEARCH_COLUMNS.all;

	return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}
