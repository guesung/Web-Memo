/**
 * 블로그 정주행 RPC 계약과 화면용 상태 타입.
 * @description 값의 원천은 `packages/supabase-edge-functions/supabase/migrations/20260930_add_blog_reading.sql`이다.
 * 생성 타입(`supabase.ts`)에 RPC가 아직 없으므로 서비스가 RPC 결과를 이 타입으로 명시 캐스팅한다.
 * 날짜는 모두 PostgREST가 내보내는 ISO 문자열이다.
 */

/** 지원 블로그 id. SQL `memo.is_supported_blog`의 값과 같다. */
export type TBlogId = "toss" | "daangn";

/** 목록 정렬. `oldest`(기본, 과거부터) 또는 `newest`(최신부터). */
export type TBlogReadingSort = "oldest" | "newest";

/** 수집 저장 상태. lease가 만료된 running은 서버가 partial로 내보낸다. */
export type TBlogSyncStatus = "pending" | "running" | "partial" | "complete";

/**
 * 화면 표시에 쓰는 수집 단계.
 * @description `collecting`은 최초 전체 수집 중, `partial`은 최초 수집이 끝나기 전 멈춘 상태,
 * `refreshing`·`refresh_failed`는 전체 수집이 한 번 끝난 뒤의 재순회 중·실패다.
 */
export type TBlogSyncPhase =
	| "pending"
	| "collecting"
	| "partial"
	| "complete"
	| "refreshing"
	| "refresh_failed";

/** 마지막 수집 실패 원인. `interrupted`는 lease가 만료돼 멈춘 작업이다. */
export type TBlogSyncError =
	| "time_limit"
	| "blocked"
	| "http_error"
	| "rate_limited"
	| "schema_changed"
	| "count_mismatch"
	| "network"
	| "internal"
	| "interrupted";

/** 지원 블로그 한 개의 고정 정보. `BLOG_CATALOG`의 항목이다. */
export interface IFBlogCatalogItem {
	/** 지원 블로그 id */
	blogId: TBlogId;
	/** 언어별 표시명 */
	displayName: { ko: string; en: string };
	/** 원문 블로그 홈 주소 */
	homeUrl: string;
}

/** 체크리스트 한 행. `get_blog_reading_page`의 `items[]` */
export interface IFBlogArticleItem {
	blogId: TBlogId;
	/** 공급자 글 ID. 토스는 글 번호, 당근은 Medium 글 ID */
	providerId: string;
	title: string;
	/** 원문 canonical URL */
	url: string;
	/** 서버가 계산한 page_key. 메모 조회 키와 같은 정규화 결과다 */
	pageKey: string;
	/** 게시 시각. 공급자가 주지 않으면 null이며 정렬에서 항상 뒤로 간다 */
	publishedAt: string | null;
	/** 본인의 유효한 메모가 있으면 true */
	completed: boolean;
	/** 완료를 만든 유효 메모 중 가장 최신 id. 미완료면 null */
	memoId: number | null;
}

/** 다음 페이지 커서. 이전 응답의 `nextCursor`를 그대로 넘긴다. */
export interface IFBlogReadingCursor {
	blogId: TBlogId;
	providerId: string;
	publishedAt: string | null;
}

/** 소스별 공개 수집 상태. `sources[]` 공통 필드 */
export interface IFBlogSourceStatus {
	blogId: TBlogId;
	status: TBlogSyncStatus;
	phase: TBlogSyncPhase;
	/** 현재 확보한 사용 가능 글 수 */
	collectedCount: number;
	/** 확정 총 글 수. 전체 수집이 검증되어 끝나기 전에는 null */
	total: number | null;
	initialCompletedAt: string | null;
	lastSuccessAt: string | null;
	lastError: TBlogSyncError | null;
	/** 대기 중인 재개 요청이 있으면 true */
	resumeQueued: boolean;
}

/** `get_blog_reading_page` 반환값 */
export interface IFBlogReadingPage {
	items: IFBlogArticleItem[];
	/** 다음 페이지가 없으면 null */
	nextCursor: IFBlogReadingCursor | null;
	/** 이 목록이 고정한 카탈로그 시점. 다음 페이지와 재조회에 그대로 넘겨 스냅샷을 유지한다 */
	catalogVersion: string;
	/** `catalogVersion` 이후 새로 들어와 목록에 섞지 않은 글 수 */
	newArticleCount: number;
	sources: IFBlogSourceStatus[];
}

/** 요약의 소스 한 개. 구독 시각과 메모 완료 수가 더해진다. */
export interface IFBlogReadingSummarySource extends IFBlogSourceStatus {
	subscribedAt: string;
	/** 유효 메모가 있는 고유 글 수 */
	completedCount: number;
}

/** `get_blog_reading_summary` 반환값. `sources`는 구독 시각 순이다. */
export interface IFBlogReadingSummary {
	sources: IFBlogReadingSummarySource[];
	/** 수집기가 다음에 재개 요청을 확인할 예정 시각 */
	nextCheckAt: string;
}

/** `set_blog_subscription` 반환값. 구독한 적 없는 블로그를 해제하면 두 시각이 모두 null이다. */
export interface IFBlogSubscriptionResult {
	blogId: TBlogId;
	active: boolean;
	subscribedAt: string | null;
	unsubscribedAt: string | null;
}

/**
 * 재개 요청 처리 결과.
 * @description `queued`는 접수(또는 대기 요청과 합쳐짐), `running`은 이미 실행 중,
 * `throttled`는 같은 사용자가 15분 안에 이미 요청한 경우다.
 */
export type TBlogSyncRequestStatus = "queued" | "running" | "throttled";

/** `request_blog_sync` 반환값 */
export interface IFBlogSyncRequestResult {
	blogId: TBlogId;
	status: TBlogSyncRequestStatus;
	/** 이미 대기·실행 중인 작업과 합쳐졌으면 true */
	coalesced: boolean;
	/** 접수 시각. `running`이면 null */
	requestedAt: string | null;
	nextCheckAt: string;
	/** `throttled`일 때만 온다. 이 시각 이후 다시 요청할 수 있다 */
	nextRequestAt?: string;
}

/**
 * 소스 한 개를 화면에서 어떤 상태로 보여 줄지.
 * @description 설계서 `목록·상태 계약` 표의 수집 관련 행과 1:1로 대응한다.
 * - `waiting`: 초기 수집 대기(아직 한 번도 시작 안 함)
 * - `collecting`: 최초 전체 수집 중. 현재 개수만 보여 주고 총량·퍼센트는 숨긴다
 * - `partialFailed`: 최초 수집이 끝나기 전에 멈춤. 기존 행 유지 + 수집 재개
 * - `resumeQueued`: 재개 요청 접수됨. 작업이 시작되면 `collecting`으로 바뀐다
 * - `complete`: 전체 수집 완료. 확정 총 글 수를 보여 준다
 * - `refreshing`: 전체 수집 뒤 새 글 확인 중. 기존 전체 목록은 그대로다
 * - `refreshFailed`: 전체 수집 뒤 새 글 확인 실패
 */
export type TBlogSourceViewState =
	| "waiting"
	| "collecting"
	| "partialFailed"
	| "resumeQueued"
	| "complete"
	| "refreshing"
	| "refreshFailed";
