import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { FavoriteService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 즐겨찾기 전체 목록(최신순) 조회의 queryKey·queryFn을 만든다. 응답의 error는 throw해 실패로 다룬다. */
export const favoritesQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions({
		queryKey: QUERY_KEY.favorites(),
		// 기본 재시도(3회, 백오프 합 7초)를 기다리는 동안 오류 박스 없이 로딩만 보이므로 1회로 줄인다.
		retry: 1,
		queryFn: async () => {
			const { data, error } = await new FavoriteService(
				supabaseClient,
			).getFavorites();

			if (error) {
				throw error;
			}

			return data;
		},
	});

export default function useFavoritesQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useSuspenseQuery(favoritesQueryOptions(supabaseClient));
}
