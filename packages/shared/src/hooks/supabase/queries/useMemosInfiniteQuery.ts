import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type MemoSortBy, QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import {
	type MemoPageCursor,
	type MemoSearchTarget,
	MemoService,
} from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

interface UseMemosInfiniteQueryProps {
	category?: string;
	isWish?: boolean;
	isStar?: boolean;
	searchQuery?: string;
	searchTarget?: MemoSearchTarget;
	sortBy?: MemoSortBy;
}

/** 페이지의 마지막 메모에서 다음 페이지 조회에 쓸 복합 커서를 만든다. */
function getNextCursor(
	lastMemo: GetMemoResponse | undefined,
	sortBy: MemoSortBy,
): MemoPageCursor | undefined {
	if (!lastMemo) return undefined;

	const value =
		sortBy === "title"
			? lastMemo.title
			: sortBy === "created_at"
				? lastMemo.created_at
				: lastMemo.updated_at;

	if (value === null || value === undefined) return undefined;

	return { value, id: lastMemo.id };
}

export default function useMemosInfiniteQuery({
	category,
	isWish,
	isStar,
	searchQuery,
	searchTarget,
	sortBy = "updated_at",
}: UseMemosInfiniteQueryProps = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = useMemo(
		() => new MemoService(supabaseClient),
		[supabaseClient],
	);

	const query = useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.memosPaginated({
			category,
			isWish,
			isStar,
			searchQuery,
			searchTarget,
			sortBy,
		}),
		queryFn: async ({ pageParam }) => {
			const result = await memoService.getMemosPaginated({
				cursor: pageParam,
				limit: PAGE_SIZE,
				category,
				isWish,
				isStar,
				searchQuery,
				searchTarget,
				sortBy,
			});

			return {
				data: (result.data ?? []) as GetMemoResponse[],
				count: result.count ?? 0,
			};
		},
		initialPageParam: undefined as MemoPageCursor | undefined,
		getNextPageParam: (lastPage) => {
			if (lastPage.data.length < PAGE_SIZE) {
				return undefined;
			}

			return getNextCursor(lastPage.data.at(-1), sortBy);
		},
	});

	const memos = query.data?.pages.flatMap((page) => page.data);
	const totalCount = query.data?.pages[0]?.count ?? 0;

	return {
		...query,
		memos,
		totalCount,
	};
}
