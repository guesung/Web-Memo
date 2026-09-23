import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { type MemoSortBy, QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { type IFMemoPageCursor, MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 한 번에 읽을 메모 수. */
const PAGE_SIZE = 20;

/** 무한 메모 목록의 필터와 정렬 조건. */
interface IFUseMemosInfiniteQueryProps {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	isReading?: boolean;
	searchQuery?: string;
	sortBy?: MemoSortBy;
}

/** 필터별 메모를 조회하고 날짜와 id로 다음 페이지를 이어 읽는다. */
const useMemosInfiniteQuery = ({
	category,
	isWish,
	isStar,
	isReading,
	searchQuery,
	sortBy = "updated_at",
}: IFUseMemosInfiniteQueryProps = {}) => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	const query = useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated(
			category,
			isWish,
			searchQuery,
			sortBy,
			isStar,
			isReading,
		),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category,
				isWish,
				isStar,
				isReading,
				searchQuery,
				sortBy,
			});

			return {
				data: (result.data ?? []) as GetMemoResponse[],
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

			const cursorValue = lastMemo[sortBy];
			if (cursorValue === null) {
				return undefined;
			}

			return { value: cursorValue, id: lastMemo.id };
		},
	});

	const memos = query.data?.pages.flatMap((page) => page.data);
	const totalCount = query.data?.pages[0]?.count ?? 0;

	return {
		...query,
		memos,
		totalCount,
	};
};

export default useMemosInfiniteQuery;
