export type MemoSortBy = "updated_at" | "created_at" | "title";

export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memo: (params: { url?: string; id?: number }) => ["memo", params],
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

	// Community
	communityMemos: (userId?: string) => ["community", "memos", { userId }],
	publicMemo: (id: number) => ["community", "memo", id],
	profile: (userId: string) => ["profile", userId],
	profileWithStats: (userId: string) => ["profile", userId, "stats"],
	userPublicMemos: (userId: string) => ["profile", userId, "memos"],
};
