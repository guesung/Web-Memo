import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { isExtension } from "../../../utils/Environment";
import { getSupabaseClient as getSupabaseClientExtension } from "../../../utils/extension";
import { getSupabaseClient as getSupabaseClientWeb } from "../../../utils/web";

/**
 * 현재 실행 환경에 맞는 Supabase 클라이언트를 반환한다.
 * @description staleTime과 gcTime을 무한으로 두는 이유는 클라이언트가 만료 개념이 없는 값이기
 * 때문이다. 기본값(0)이면 항상 stale로 취급돼 이 훅을 쓰는 컴포넌트가 마운트될 때마다 queryFn이
 * 다시 돌고, 그때마다 세션 확인이 한 번씩 더 일어난다.
 */
export default function useSupabaseClientQuery() {
	const query = useSuspenseQuery({
		queryFn: isExtension() ? getSupabaseClientExtension : getSupabaseClientWeb,
		queryKey: QUERY_KEY.supabaseClient(),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});

	return {
		...query,
		data: query.data as MemoSupabaseClient,
	};
}
