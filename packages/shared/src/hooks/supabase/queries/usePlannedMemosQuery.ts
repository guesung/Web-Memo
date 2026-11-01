import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 읽을 계획 탭의 필터 조건. */
interface IFUsePlannedMemosQueryProps {
	category?: string;
	searchQuery?: string;
}

/**
 * 계획 날짜가 있는 메모를 한 번에 가져온다.
 * @description 무한 스크롤을 쓰지 않는다. 커서가 정렬 컬럼 값이라 같은 날짜에 여러 건이면 페이지가 어긋나고,
 * 계획해 둔 글은 수십 건 규모라 상한 안에서 한 번에 받아 화면이 구역을 나눈다.
 */
export default function usePlannedMemosQuery({
	category,
	searchQuery,
}: IFUsePlannedMemosQueryProps = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryKey: QUERY_KEY.memosPlanned(category, searchQuery),
		queryFn: async () => {
			const result = await new MemoService(supabaseClient).getPlannedMemos({
				category,
				searchQuery,
			});

			return {
				data: (result.data ?? []) as GetMemoResponse[],
				/** 화면은 실패를 빈 목록으로 보이지만, QueryCache가 이 값을 보고 Sentry에 보고한다. */
				error: result.error,
			};
		},
	});

	return { ...query, memos: query.data.data };
}
