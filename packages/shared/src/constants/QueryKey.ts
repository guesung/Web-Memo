export type MemoSortBy = "updated_at" | "created_at" | "title";

/** 하이라이트 목록(무한 스크롤) 쿼리를 구분하는 필터 조합 */
export interface HighlightsPaginatedKeyParams {
	searchQuery?: string;
	color?: string;
}

/** 조회와 캐시 갱신에서 공유하는 쿼리 키 및 부분 매칭 접두사. */
export const QUERY_KEY = {
	tab: () => ["tab"],
	memos: () => ["memos"],
	memo: (params: { url?: string; id?: number }) => ["memo", params],
	/** 모든 페이지네이션 필터를 부분 매칭하며 휴지통 캐시는 포함하지 않는다. */
	memosPaginatedPrefix: () => ["memos", "paginated"],
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
	/**
	 * 휴지통 목록.
	 * @description `memos()` 접두사를 일부러 공유한다. 메모를 버리거나 되살리면
	 * 목록과 휴지통이 같이 바뀌므로, 한쪽만 무효화해 다른 쪽이 옛 데이터를
	 * 들고 있는 상황을 만들지 않기 위해서다.
	 */
	deletedMemos: () => ["memos", "deleted"],
	option: () => ["option"],
	supabaseClient: () => ["supabaseClient"],
	supabaseFeedbackClient: () => ["supabaseFeedbackClient"],
	user: () => ["user"],
	category: () => ["cateogory"],
	setting: () => ["setting"],
	/** 대시보드 통계. `includeAdmin`이 다르면 다른 캐시여야 토글이 재조회를 일으킨다. */
	adminStats: (includeAdmin = false) => ["adminStats", includeAdmin],
	activeUsersStats: (includeAdmin = false) => [
		"activeUsersStats",
		includeAdmin,
	],
	userGrowth: (days: number, includeAdmin = false) => [
		"userGrowth",
		days,
		includeAdmin,
	],
	/**
	 * 관리자 사용자 목록. 검색어마다 별도 캐시다.
	 * @description 페이지 인자를 받지 않는다. get_admin_users는 페이지네이션이 없어 전체를
	 * 한 번에 돌려주는데, 받지도 않는 인자를 키에 남겨 두면 표가 구독하는 키와 검색 폼이
	 * 무효화하는 키가 어긋나도 눈에 띄지 않는다. 실제로 그렇게 어긋나 검색이 죽어 있었다.
	 */
	adminUsers: (search?: string) => ["adminUsers", search],
	/** 관리자 피드백 목록. 검색어·페이지·페이지 크기 조합마다 별도 캐시다. */
	feedbacks: (search?: string, page?: number, pageSize?: number) => [
		"feedbacks",
		search,
		page,
		pageSize,
	],
	/** 피드백 한 건. `?id=`로 들어온 행이 현재 페이지에 없을 때만 쓴다. */
	feedback: (id: number) => ["feedbacks", "detail", id],
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
	/** 사이드 패널 공지. 세션과 무관한 공개 데이터라 사용자별로 나누지 않는다. */
	notice: () => ["notice"],
};
