import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import type { MemoSupabaseClient } from "../../types/supabaseCustom";
import { getBlogReadingSummary } from "../../utils/supabase/blogReadingService";
import { shouldRetryBlogReadingQuery } from "./useBlogReadingPageQuery";

/** 블로그 정주행 요약의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const blogReadingSummaryQueryOptions = (params: {
	supabaseClient: MemoSupabaseClient;
	userId: string;
}) =>
	queryOptions({
		queryKey: QUERY_KEY.blogReadingSummary(params.userId),
		queryFn: () =>
			getBlogReadingSummary({ supabaseClient: params.supabaseClient }),
		staleTime: 0,
		retry: shouldRetryBlogReadingQuery,
	});

/** {@link useBlogReadingSummaryQuery} 인자 */
export interface IFUseBlogReadingSummaryQueryParams {
	supabaseClient: MemoSupabaseClient;
	/** 로그인 사용자 id. 없으면 조회하지 않는다 */
	userId: string | null | undefined;
	/** 웹 창 focus·앱 foreground 때 다시 검증할지. 기본 true. React Native는 `focusManager`에 AppState를 연결해야 한다 */
	revalidateOnFocus?: boolean;
}

/**
 * 구독별 수집 글 수·메모 완료 수·수집 상태를 조회한다.
 * @description 구독 목록(구독 없음 판단)·진입 카드·소스별 상태 문구에 쓴다. 부분 수집 소스의 `total`은 null이다.
 * 메모 변경 때 `["memos"]` 접두사 무효화로 완료 수가 갱신된다.
 */
export const useBlogReadingSummaryQuery = (
	params: IFUseBlogReadingSummaryQueryParams,
) =>
	useQuery({
		...blogReadingSummaryQueryOptions({
			supabaseClient: params.supabaseClient,
			userId: params.userId ?? "",
		}),
		enabled: Boolean(params.userId),
		refetchOnWindowFocus: params.revalidateOnFocus === false ? false : "always",
	});
