export type MemoSortBy = "updated_at" | "created_at" | "title";

/** 하이라이트 목록(무한 스크롤) 쿼리를 구분하는 필터 조합 */
export interface HighlightsPaginatedKeyParams {
	searchQuery?: string;
	color?: string;
}

export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memo: (params: { url?: string; id?: number }) => ["memo", params],
	memosPaginated: (
		category?: string,
		isWish?: boolean,
		searchQuery?: string,
		sortBy?: MemoSortBy,
		isStar?: boolean,
	) => [
		"memos",
		"paginated",
		{ category, isWish, searchQuery, sortBy, isStar },
	],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
	adminStats: () => ["adminStats"],
	activeUsersStats: () => ["activeUsersStats"],
	userGrowth: (days: number) => ["userGrowth", days],
	adminUsers: (search?: string, page?: number) => ["adminUsers", search, page],
	highlightsByUrl: (url: string) => ["highlights", "byUrl", url],
	highlightsPaginated: (params: HighlightsPaginatedKeyParams) => [
		"highlights",
		"paginated",
		params,
	],
};
