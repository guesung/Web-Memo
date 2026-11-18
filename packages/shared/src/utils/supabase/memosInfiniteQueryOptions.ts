import { infiniteQueryOptions } from "@tanstack/react-query";
import { type MemoSortBy, QUERY_KEY } from "../../constants";
import type { GetMemoResponse, MemoSupabaseClient } from "../../types";
import { type IFMemoPageCursor, MemoService } from "./memoService";

/** 한 번에 읽을 메모 수. */
const PAGE_SIZE = 20;

/** 무한 메모 목록의 필터와 정렬 조건. */
export interface IFMemosInfiniteQueryParams {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	isReading?: boolean;
	searchQuery?: string;
	domain?: string;
	sortBy?: MemoSortBy;
}

/**
 * 필터별 메모 목록 조회의 queryKey·queryFn·커서를 만든다.
 *
 * @description 서버 prefetch와 클라이언트 훅이 같은 옵션을 써야 키가 어긋나지 않아,
 * 서버에서 시작한 조회를 브라우저가 이어받는다. 훅 파일은 서버 컴포넌트에서 import할 수
 * 없어 utils에 둔다.
 */
export const memosInfiniteQueryOptions = (
	supabaseClient: MemoSupabaseClient,
	{
		category,
		isWish,
		isStar,
		isReading,
		searchQuery,
		domain,
		sortBy = "updated_at",
	}: IFMemosInfiniteQueryParams = {},
) =>
	infiniteQueryOptions({
		queryKey: QUERY_KEY.memosPaginated(
			category,
			isWish,
			searchQuery,
			sortBy,
			isStar,
			isReading,
			domain,
		),
		queryFn: async ({ pageParam }) => {
			const result = await new MemoService(supabaseClient).getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category,
				isWish,
				isStar,
				isReading,
				searchQuery,
				domain,
				sortBy,
				// 화면은 첫 페이지의 개수만 쓴다. 다음 페이지마다 전체를 다시 세지 않는다.
				withCount: pageParam === undefined,
			});

			return {
				data: (result.data ?? []) as GetMemoResponse[],
				/** 첫 페이지만 실제 개수다. 다음 페이지는 세지 않아 0이다. */
				count: result.count ?? 0,
				/** 화면은 실패를 빈 목록으로 보이지만, QueryCache가 이 값을 보고 Sentry에 보고한다. */
				error: result.error,
			};
		},
		initialPageParam: undefined as string | IFMemoPageCursor | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) {
				return undefined;
			}
			const lastMemo = lastPage.data.at(-1);
			if (!lastMemo) {
				return undefined;
			}
			if (sortBy === "title") {
				return lastMemo.title ?? undefined;
			}

			return { value: lastMemo[sortBy], id: lastMemo.id };
		},
	});
