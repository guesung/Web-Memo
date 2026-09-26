import type { UserResponse } from "@supabase/supabase-js";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { AuthService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 로그인 사용자 조회(서버 검증 getUser)의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const userQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions<UserResponse, Error>({
		queryFn: new AuthService(supabaseClient).getUser,
		queryKey: QUERY_KEY.user(),
		retry: false,
	});

export default function useSupabaseUserQuery() {
	const { data: supabaseClient, refetch: refetchSupabaseClient } =
		useSupabaseClientQuery();

	const query = useSuspenseQuery(userQueryOptions(supabaseClient));

	return {
		...query,
		user: query.data,
		refetchSupabaseClient,
	};
}
