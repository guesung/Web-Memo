import {
	queryOptions,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { CategoryService } from "../../../utils";

import useMemoStoreQuery from "./useMemoStoreQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/** 비로그인(기기 저장소)에는 서버에 저장된 행이 없다. */
const GUEST_RESPONSE = { data: null, error: null } as const;

/** 카테고리 목록 조회의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const categoryQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions({
		queryFn: new CategoryService(supabaseClient).getCategories,
		queryKey: QUERY_KEY.category(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

/**
 * 카테고리 목록을 조회한다.
 * @description 확장에서 세션이 없어 기기 저장소를 쓰는 동안에는 카테고리가 없으므로 서버를 부르지 않고 빈 목록을 돌려준다.
 */
export default function useCategoryQuery() {
	const queryClient = useQueryClient();
	const { data: memoStore } = useMemoStoreQuery();
	const isGuest = memoStore.kind === "local";

	const query = useSuspenseQuery({
		queryKey: isGuest
			? [...QUERY_KEY.category(), "guest"]
			: QUERY_KEY.category(),
		queryFn: async () => {
			if (isGuest) {
				return GUEST_RESPONSE;
			}

			const supabaseClient = await queryClient.ensureQueryData(
				supabaseClientQueryOptions(),
			);

			return new CategoryService(supabaseClient).getCategories();
		},
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
		// 기기 저장소 상태의 빈 결과는 네트워크가 필요 없다. 기본값이면 오프라인에서 Suspense가 풀리지 않는다.
		networkMode: isGuest ? "always" : "online",
	});

	return {
		...query,
		categories: query.data?.data,
	};
}
