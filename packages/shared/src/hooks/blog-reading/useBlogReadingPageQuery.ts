import {
	type InfiniteData,
	infiniteQueryOptions,
	type QueryClient,
	useInfiniteQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import type {
	IFBlogReadingCursor,
	IFBlogReadingPage,
	TBlogId,
	TBlogReadingSort,
} from "../../types/blogReading";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import {
	BlogReadingError,
	getBlogReadingPage,
} from "../../utils/supabase/blogReadingService";

/** 목록 페이지 조회 인자. 첫 페이지는 커서·시점이 없고, 다음 페이지는 첫 페이지의 시점을 이어 받는다. */
export interface IFBlogReadingPageParam {
	cursor: IFBlogReadingCursor | null;
	catalogVersion: string | null;
}

/**
 * 블로그 정주행 조회 재시도 여부.
 * @description 로그인 필요·잘못된 요청·구독 필요는 기다려도 바뀌지 않으므로 재시도하지 않는다.
 * 네트워크·서버 오류만 2번까지 다시 시도한다. 요약 조회도 같은 규칙을 쓴다.
 */
export const shouldRetryBlogReadingQuery = (
	failureCount: number,
	error: Error,
): boolean => {
	if (
		error instanceof BlogReadingError &&
		error.code !== "network" &&
		error.code !== "unknown"
	) {
		return false;
	}

	return failureCount < 2;
};

/**
 * 블로그 정주행 목록(무한 조회)의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다.
 * @description 재조회(메모 변경 무효화·포커스·재진입) 때 첫 페이지도 캐시에 있던 `catalogVersion`을 넘겨
 * 수집으로 새 글이 들어와도 읽던 순서를 바꾸지 않는다. 새 글은 `newArticleCount`로만 알린다.
 * 새 시점으로 바꾸려면 `resetQueries`로 캐시를 비운다(훅의 `refreshCatalog`).
 */
export const blogReadingPageQueryOptions = (params: {
	queryClient: QueryClient;
	supabaseClient: MemoSupabaseClient;
	userId: string;
	blogId: TBlogId | null;
	sort: TBlogReadingSort;
}) =>
	infiniteQueryOptions<
		IFBlogReadingPage,
		Error,
		InfiniteData<IFBlogReadingPage, IFBlogReadingPageParam>,
		readonly unknown[],
		IFBlogReadingPageParam
	>({
		queryKey: QUERY_KEY.blogReadingPage(params.userId, {
			blogId: params.blogId,
			sort: params.sort,
		}),
		queryFn: async ({ pageParam, queryKey }) => {
			const cachedData =
				params.queryClient.getQueryData<InfiniteData<IFBlogReadingPage>>(
					queryKey,
				);
			const catalogVersion =
				pageParam.catalogVersion ??
				cachedData?.pages[0]?.catalogVersion ??
				null;

			return getBlogReadingPage({
				supabaseClient: params.supabaseClient,
				blogId: params.blogId,
				sort: params.sort,
				cursor: pageParam.cursor,
				catalogVersion,
			});
		},
		initialPageParam: { cursor: null, catalogVersion: null },
		getNextPageParam: (lastPage, allPages) => {
			if (!lastPage.nextCursor) {
				return undefined;
			}

			return {
				cursor: lastPage.nextCursor,
				catalogVersion: allPages[0]?.catalogVersion ?? lastPage.catalogVersion,
			};
		},
		staleTime: 0,
		retry: shouldRetryBlogReadingQuery,
	});

/** {@link useBlogReadingPageQuery} 인자 */
export interface IFUseBlogReadingPageQueryParams {
	/** 앱·웹이 각자 만든 Supabase client */
	supabaseClient: MemoSupabaseClient;
	/** 로그인 사용자 id. 없으면 조회하지 않는다 */
	userId: string | null | undefined;
	/** 출처 필터. null·생략이면 구독 전체 */
	blogId?: TBlogId | null;
	/** 기본 `oldest` */
	sort?: TBlogReadingSort;
	/**
	 * 웹 창 focus·앱 foreground 때 다시 검증할지. 기본 true.
	 * @description TanStack Query의 focus 이벤트를 쓴다. React Native는 `focusManager`에 AppState를 연결해야 foreground에서 동작한다.
	 */
	revalidateOnFocus?: boolean;
}

/**
 * 블로그 정주행 체크리스트를 30개씩 이어 읽는다.
 * @description 출처·정렬이 바뀌면 다른 캐시라 첫 페이지부터 새 스냅샷으로 시작한다. 화면 재진입 때마다 다시 검증한다.
 * 메모 변경은 `["memos"]` 접두사 무효화로 완료 표시가 갱신된다.
 * @example
 * const pageQuery = useBlogReadingPageQuery({ supabaseClient, userId, blogId: null, sort: "oldest" });
 * pageQuery.articles; pageQuery.newArticleCount; await pageQuery.refreshCatalog();
 */
export const useBlogReadingPageQuery = (
	params: IFUseBlogReadingPageQueryParams,
) => {
	const queryClient = useQueryClient();
	const userId = params.userId ?? "";
	const options = blogReadingPageQueryOptions({
		queryClient,
		supabaseClient: params.supabaseClient,
		userId,
		blogId: params.blogId ?? null,
		sort: params.sort ?? "oldest",
	});
	const query = useInfiniteQuery({
		...options,
		enabled: Boolean(params.userId),
		refetchOnWindowFocus: params.revalidateOnFocus === false ? false : "always",
	});
	const firstPage = query.data?.pages[0];

	/** 지금 스냅샷을 버리고 새 카탈로그 시점으로 첫 페이지부터 다시 읽는다('목록 갱신'). */
	const refreshCatalog = async () => {
		await queryClient.resetQueries({ queryKey: options.queryKey, exact: true });
	};

	return {
		...query,
		/** 지금까지 불러온 모든 페이지의 행 */
		articles: query.data?.pages.flatMap((page) => page.items) ?? [],
		/** 목록에 섞지 않은 새 글 수 */
		newArticleCount: firstPage?.newArticleCount ?? 0,
		/** 목록 범위 소스의 수집 상태 */
		sources: firstPage?.sources ?? [],
		/** 이 목록이 고정한 카탈로그 시점 */
		catalogVersion: firstPage?.catalogVersion ?? null,
		refreshCatalog,
	};
};
