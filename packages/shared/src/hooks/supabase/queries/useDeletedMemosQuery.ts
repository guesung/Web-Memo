import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/**
 * 휴지통에 있는 메모를 최근에 버린 순으로 가져온다.
 * @description 목록은 무한 스크롤을 쓰지 않는다. 휴지통은 훑어보고 되살리거나
 * 비우는 화면이라 한 번에 받아도 되고, 페이지네이션이 붙으면 "전체 비우기"의
 * 대상 집합이 화면과 어긋나기 시작한다.
 */
export default function useDeletedMemosQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useQuery({
		queryKey: QUERY_KEY.deletedMemos(),
		queryFn: async (): Promise<GetMemoResponse[]> => {
			const { data } = await new MemoService(supabaseClient).getDeletedMemos();
			return (data ?? []) as GetMemoResponse[];
		},
	});
}
