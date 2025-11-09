export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memoById: (id: number) => ["memoById", id],
	memoByUrl: (url: string) => ["memoByUrl", url],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
};
