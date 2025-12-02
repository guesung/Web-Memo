import { useSuspenseQuery } from "@tanstack/react-query";
import { getChoseong } from "es-hangul";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

type QueryFnData = Awaited<ReturnType<MemoService["getMemos"]>>;
type QueryError = Error;
type QueryData = GetMemoResponse[];

type SortByType = "updatedAt" | "createdAt" | "title";
type SortOrderType = "desc" | "asc";

interface UseMemosQueryProps {
	category?: string;
	isWish?: boolean;
	searchQuery?: string;
	searchTarget?: string;
	sortBy?: SortByType;
	sortOrder?: SortOrderType;
}

function sortMemos(
	memos: GetMemoResponse[],
	sortBy: SortByType,
	sortOrder: SortOrderType,
): GetMemoResponse[] {
	return [...memos].sort((a, b) => {
		let comparison = 0;

		if (sortBy === "title") {
			const titleA = a.title?.toLowerCase() ?? "";
			const titleB = b.title?.toLowerCase() ?? "";
			comparison = titleA.localeCompare(titleB, "ko");
		} else if (sortBy === "createdAt") {
			const dateA = new Date(a.created_at ?? 0).getTime();
			const dateB = new Date(b.created_at ?? 0).getTime();
			comparison = dateA - dateB;
		} else {
			const dateA = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
			const dateB = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
			comparison = dateA - dateB;
		}

		return sortOrder === "desc" ? -comparison : comparison;
	});
}

export default function useMemosQuery({
	category,
	isWish = false,
	searchQuery,
	searchTarget,
	sortBy = "updatedAt",
	sortOrder = "desc",
}: UseMemosQueryProps = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const searchQueryLower = searchQuery?.toLowerCase();

	const query = useSuspenseQuery<QueryFnData, QueryError, QueryData>({
		queryFn: new MemoService(supabaseClient).getMemos,
		select: ({ data: memos }) => {
			const filtered =
				memos
					?.filter((memo) => !!isWish === !!memo.isWish)
					.filter((memo) =>
						category ? memo.category?.name === category : true,
					)
					.filter((memo) => {
						if (!searchQueryLower) return true;

						const isTitleMatch =
							memo.title?.toLowerCase().includes(searchQueryLower) ||
							getChoseong(memo.title).includes(searchQueryLower);
						const isMemoMatch =
							memo.memo?.toLowerCase().includes(searchQueryLower) ||
							getChoseong(memo.memo).includes(searchQueryLower);
						const isCategoryMatch = memo.category?.name
							.toLowerCase()
							.includes(searchQueryLower);

						if (isCategoryMatch) return true;
						if (searchTarget === "title") return isTitleMatch;
						if (searchTarget === "memo") return isMemoMatch;
						return isTitleMatch || isMemoMatch;
					}) ?? [];

			return sortMemos(filtered, sortBy, sortOrder);
		},
		queryKey: QUERY_KEY.memos(),
	});

	return {
		...query,
		memos: query.data ?? [],
	};
}
