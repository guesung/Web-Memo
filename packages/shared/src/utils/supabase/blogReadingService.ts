import type { PostgrestError } from "@supabase/supabase-js";
import { BLOG_READING_PAGE_SIZE } from "../../constants/blogCatalog";
import { SUPABASE } from "../../constants/SupabaseConfig";
import type {
	IFBlogReadingCursor,
	IFBlogReadingPage,
	IFBlogReadingSummary,
	IFBlogSubscriptionResult,
	IFBlogSyncRequestResult,
	TBlogId,
	TBlogReadingSort,
} from "../../types/blogReading";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";

// 이 파일은 앱이 좁은 경로로 직접 import한다. 환경 모듈(@web-memo/env)이나 utils·constants 배럴을 끌어오지 않도록
// 파일 단위 경로로만 import한다.

/**
 * 블로그 정주행 오류 분류.
 * @description 화면은 `code`로 문구·동작을 고른다(웹은 번역 키, 앱은 한국어 문구).
 * - `unauthenticated`: 로그인 필요(세션 없음·만료)
 * - `subscription_required`: 구독하지 않은 블로그에 재개 요청
 * - `invalid_request`: 잘못된 블로그·정렬·페이지 크기·커서. `reason`이 `invalid_cursor`면 목록을 처음부터 다시 불러온다
 * - `network`: 오프라인·연결 실패. 기존 캐시를 유지한다
 * - `unknown`: 그 밖의 서버 오류
 */
export type TBlogReadingErrorCode =
	| "unauthenticated"
	| "subscription_required"
	| "invalid_request"
	| "network"
	| "unknown";

/**
 * 블로그 정주행 서비스가 던지는 사용자 친화 오류.
 * @description `message`는 바로 보여 줄 수 있는 한국어 문구다. `reason`은 SQL 예외 메시지(`invalid_cursor` 등) 원문이다.
 */
export class BlogReadingError extends Error {
	code: TBlogReadingErrorCode;
	reason: string | null;

	constructor(params: {
		code: TBlogReadingErrorCode;
		reason: string | null;
		message: string;
	}) {
		super(params.message);
		this.name = "BlogReadingError";
		this.code = params.code;
		this.reason = params.reason;
	}
}

/**
 * Supabase(PostgREST) 오류를 {@link BlogReadingError}로 바꾼다.
 * @description RPC 계약의 오류 코드: `PT401` unauthenticated · `42501` subscription_required · `22023` invalid_*.
 * 로그인하지 않은 anon 호출은 실행 권한이 없어 `42501 permission denied`가 오므로, 메시지가 `subscription_required`가
 * 아닌 42501은 로그인 필요로 본다. 만료 JWT(`PGRST30x`)도 로그인 필요다.
 */
export const toBlogReadingError = (
	error: Pick<PostgrestError, "code" | "message">,
): BlogReadingError => {
	const code = error.code ?? "";
	const reason = error.message || null;

	if (
		code === "PT401" ||
		/^PGRST30[0-3]$/.test(code) ||
		(code === "42501" && reason !== "subscription_required")
	) {
		return new BlogReadingError({
			code: "unauthenticated",
			reason,
			message: "로그인이 필요해요.",
		});
	}

	if (code === "42501") {
		return new BlogReadingError({
			code: "subscription_required",
			reason,
			message: "구독한 블로그만 수집을 요청할 수 있어요.",
		});
	}

	if (code === "22023") {
		return new BlogReadingError({
			code: "invalid_request",
			reason,
			message: "요청을 처리하지 못했어요. 목록을 다시 불러와 주세요.",
		});
	}

	if (!code && /fetch|network/i.test(reason ?? "")) {
		return new BlogReadingError({
			code: "network",
			reason,
			message: "네트워크 연결을 확인해 주세요.",
		});
	}

	return new BlogReadingError({
		code: "unknown",
		reason,
		message: "잠시 후 다시 시도해 주세요.",
	});
};

/** 목록 한 페이지 조회 인자. 커서와 카탈로그 시점은 이전 응답 값을 그대로 넘긴다. */
export interface IFGetBlogReadingPageParams {
	supabaseClient: MemoSupabaseClient;
	/** 특정 블로그만 볼 때. 생략하면 본인 활성 구독 전체 */
	blogId?: TBlogId | null;
	/** 기본 `oldest` */
	sort?: TBlogReadingSort;
	/** 기본 {@link BLOG_READING_PAGE_SIZE}(30). 1~100 */
	pageSize?: number;
	/** 이전 응답의 `nextCursor`. 첫 페이지는 생략 */
	cursor?: IFBlogReadingCursor | null;
	/** 이전 응답의 `catalogVersion`. 넘기면 그 뒤 들어온 글을 섞지 않는다 */
	catalogVersion?: string | null;
}

/**
 * 본인 활성 구독 범위의 체크리스트 한 페이지를 조회한다(`get_blog_reading_page`).
 * @description 실패하면 {@link BlogReadingError}를 던진다.
 * @example await getBlogReadingPage({ supabaseClient, sort: "oldest" })
 */
export const getBlogReadingPage = async (
	params: IFGetBlogReadingPageParams,
): Promise<IFBlogReadingPage> =>
	callBlogReadingRpc<IFBlogReadingPage>({
		supabaseClient: params.supabaseClient,
		functionName: "get_blog_reading_page",
		args: {
			p_blog_id: params.blogId ?? null,
			p_sort: params.sort ?? "oldest",
			p_page_size: params.pageSize ?? BLOG_READING_PAGE_SIZE,
			p_cursor: params.cursor ?? null,
			p_catalog_version: params.catalogVersion ?? null,
		},
	});

/**
 * 본인 구독별 수집 글 수·메모 완료 수·수집 상태를 조회한다(`get_blog_reading_summary`).
 * @description 부분 수집 중인 소스의 `total`은 null이다. 실패하면 {@link BlogReadingError}를 던진다.
 */
export const getBlogReadingSummary = async (params: {
	supabaseClient: MemoSupabaseClient;
}): Promise<IFBlogReadingSummary> =>
	callBlogReadingRpc<IFBlogReadingSummary>({
		supabaseClient: params.supabaseClient,
		functionName: "get_blog_reading_summary",
	});

/**
 * 블로그를 구독하거나 해제한다(`set_blog_subscription`).
 * @description 해제는 목록만 숨기고 메모·카탈로그는 보존한다. 같은 상태로 다시 호출해도 시각이 바뀌지 않는다(멱등).
 */
export const setBlogSubscription = async (params: {
	supabaseClient: MemoSupabaseClient;
	blogId: TBlogId;
	active: boolean;
}): Promise<IFBlogSubscriptionResult> =>
	callBlogReadingRpc<IFBlogSubscriptionResult>({
		supabaseClient: params.supabaseClient,
		functionName: "set_blog_subscription",
		args: { p_blog_id: params.blogId, p_active: params.active },
	});

/**
 * 멈춘 수집의 재개를 요청한다(`request_blog_sync`).
 * @description 화면이 수집기를 직접 실행하지 않고 큐에 요청만 남긴다. 결과 `status`로 접수·실행 중·15분 제한을 구분한다.
 * 구독하지 않은 블로그면 `subscription_required` 오류를 던진다.
 */
export const requestBlogSync = async (params: {
	supabaseClient: MemoSupabaseClient;
	blogId: TBlogId;
}): Promise<IFBlogSyncRequestResult> =>
	callBlogReadingRpc<IFBlogSyncRequestResult>({
		supabaseClient: params.supabaseClient,
		functionName: "request_blog_sync",
		args: { p_blog_id: params.blogId },
	});

/** 생성 타입 없이 memo 스키마 RPC를 부르기 위한 최소 모양. */
interface IFBlogReadingRpcClient {
	rpc: (
		functionName: string,
		args?: Record<string, unknown>,
	) => PromiseLike<{
		data: unknown;
		error: Pick<PostgrestError, "code" | "message"> | null;
	}>;
}

/**
 * memo 스키마 RPC를 부르고 오류를 사용자 친화 오류로 바꾼다.
 * @description 원격 DB에 마이그레이션이 적용되기 전이라 생성 타입(`supabase.ts`)에 블로그 정주행 RPC가 없다.
 * 그래서 RPC 이름·인자·결과를 `blogReading.ts` 타입으로 명시 캐스팅한다. 타입 재생성 뒤에는 캐스팅을 걷어낼 수 있다.
 */
const callBlogReadingRpc = async <TResult>(params: {
	supabaseClient: MemoSupabaseClient;
	functionName: string;
	args?: Record<string, unknown>;
}): Promise<TResult> => {
	const memoSchema = params.supabaseClient.schema(
		SUPABASE.schema.memo,
	) as unknown as IFBlogReadingRpcClient;
	const response = await memoSchema.rpc(params.functionName, params.args);

	if (response.error) {
		throw toBlogReadingError(response.error);
	}

	if (response.data === null || response.data === undefined) {
		throw new BlogReadingError({
			code: "unknown",
			reason: "empty_response",
			message: "잠시 후 다시 시도해 주세요.",
		});
	}

	return response.data as TResult;
};
