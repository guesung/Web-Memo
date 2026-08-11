import type { MemoSearchTarget } from "../utils/memoSearchFilter";

export type MemoSortBy = "updated_at" | "created_at" | "title";

/** 메모 목록(무한 스크롤) 쿼리를 구분하는 필터 조합 */
export interface MemosPaginatedKeyParams {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	searchQuery?: string;
	searchTarget?: MemoSearchTarget;
	sortBy?: MemoSortBy;
}

export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memo: (params: { url?: string; id?: number }) => ["memo", params],
	memosPaginated: (params: MemosPaginatedKeyParams) => [
		"memos",
		"paginated",
		params,
	],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
	adminStats: () => ["adminStats"],
	activeUsersStats: () => ["activeUsersStats"],
	userGrowth: (days: number) => ["userGrowth", days],
	adminUsers: (search?: string, page?: number) => ["adminUsers", search, page],
};
