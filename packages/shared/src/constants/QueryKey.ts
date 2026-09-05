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
		isReading?: boolean,
	) => [
		"memos",
		"paginated",
		{ category, isWish, searchQuery, sortBy, isStar, isReading },
	],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	supabaseFeedbackClient: () => ["supabaseFeedbackClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
	setting: () => ["setting"],
	adminStats: () => ["adminStats"],
	activeUsersStats: () => ["activeUsersStats"],
	userGrowth: (days: number) => ["userGrowth", days],
	adminUsers: (search?: string, page?: number) => ["adminUsers", search, page],
	/** `highlightsByUrl`/`highlightsPaginated`의 공통 접두사. prefix 매칭으로 둘 다 무효화할 때 쓴다(memos()와 같은 패턴). */
	highlights: () => ["highlights"],
	highlightsByUrl: (url: string) => ["highlights", "byUrl", url],
	highlightsPaginated: (params: HighlightsPaginatedKeyParams) => [
		"highlights",
		"paginated",
		params,
	],
	/** `[...urls]`로 복사한 뒤 정렬해 원본 배열을 변형하지 않으면서 순서 무관 캐시 키를 만든다. */
	highlightCounts: (urls: string[]) => [
		"highlights",
		"counts",
		[...urls].sort(),
	],
	/** `highlightCounts`의 공통 접두사. URL 배열을 모르는 뮤테이션에서 prefix 매칭으로 무효화할 때 쓴다. */
	highlightCountsPrefix: () => ["highlights", "counts"],
};
