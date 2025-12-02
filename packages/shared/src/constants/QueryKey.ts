export type MemoSortBy = "updated_at" | "created_at" | "title";

export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memosPaginated: (
		category?: string,
		isWish?: boolean,
		searchQuery?: string,
		sortBy?: MemoSortBy,
	) => [
		"memos",
		"paginated",
		{ category, isWish, searchQuery, sortBy },
	],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
	adminStats: () => ["adminStats"],
	userGrowth: (days: number) => ["userGrowth", days],
	adminUsers: (search?: string, page?: number) => ["adminUsers", search, page],
};
