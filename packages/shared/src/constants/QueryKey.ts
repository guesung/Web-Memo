export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memosPaginated: (category?: string, isWish?: boolean) => [
		"memos",
		"paginated",
		{ category, isWish },
	],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
};
