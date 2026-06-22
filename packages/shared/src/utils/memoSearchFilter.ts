/**
 * 메모 검색(searchQuery)을 Supabase `.or()` 필터 문자열로 변환한다.
 * title, memo, impression, actionItem 네 컬럼을 부분 일치(ilike)로 검색한다.
 */
export function getMemoSearchFilter(searchQuery: string): string {
	const pattern = `%${searchQuery}%`;

	return [
		`title.ilike.${pattern}`,
		`memo.ilike.${pattern}`,
		`impression.ilike.${pattern}`,
		`actionItem.ilike.${pattern}`,
	].join(",");
}
