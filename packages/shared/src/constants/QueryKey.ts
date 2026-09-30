import type { TBlogId, TBlogReadingSort } from "../types/blogReading";

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
	/**
	 * 쿼리만 다른 주소까지 포함한 같은 경로의 메모 후보.
	 * @description `["memo"]` 접두사를 공유해 메모 수정 뒤의 `["memo"]` 무효화에 함께 걸린다.
	 */
	samePathMemos: (pathKey: string) => ["memo", "samePath", pathKey],
	/** 모든 경로의 {@link QUERY_KEY.samePathMemos}를 부분 매칭한다. */
	samePathMemosPrefix: () => ["memo", "samePath"],
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
	/** 사이드 패널 과거 메모 판정. 정규화한 페이지 URL마다 별도 캐시다. */
	pastMemo: (normalizedUrl: string) => ["pastMemo", normalizedUrl],
	/** 옵션 페이지의 `_execute_action` 단축키. */
	shortcut: () => ["shortcut"],
	/**
	 * 블로그 정주행 개인 캐시 전체(모든 계정)의 접두사.
	 * @description 목록 행의 완료 표시와 요약의 완료 수가 메모에서 계산되므로 `memos()` 아래에 둔다.
	 * 그래서 기존 메모 생성·수정·삭제·복원의 `["memos"]` 무효화(웹·확장·앱)에 함께 걸린다.
	 * 로그아웃·계정 전환 때 `removeQueries`로 개인 캐시를 지울 때도 쓴다.
	 */
	blogCompletionPrefix: () => ["memos", "blogCompletion"],
	/** 한 계정의 블로그 정주행 캐시 전체. `["memos","blogCompletion",userId,...]` */
	blogCompletion: (userId: string) => ["memos", "blogCompletion", userId],
	/** 한 계정의 모든 필터·정렬 목록을 부분 매칭한다. 구독 변경 뒤 스냅샷을 새로 잡을 때 쓴다. */
	blogReadingPages: (userId: string) => [
		"memos",
		"blogCompletion",
		userId,
		"page",
	],
	/**
	 * 블로그 정주행 목록(커서 무한 조회). 출처 필터·정렬마다 별도 캐시다.
	 * @description 카탈로그 시점(`catalogVersion`)은 키에 넣지 않고 캐시된 첫 페이지에서 이어 받는다.
	 * 그래야 메모 변경·포커스 재조회 때 같은 스냅샷을 유지하고, '목록 갱신'(resetQueries) 때만 새 시점을 잡는다.
	 */
	blogReadingPage: (
		userId: string,
		params: { blogId: TBlogId | null; sort: TBlogReadingSort },
	) => ["memos", "blogCompletion", userId, "page", params],
	/** 블로그 정주행 요약(구독별 수집 수·완료 수·수집 상태). */
	blogReadingSummary: (userId: string) => [
		"memos",
		"blogCompletion",
		userId,
		"summary",
	],
};
