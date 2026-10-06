import type { UserResponse } from "@supabase/supabase-js";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { AuthService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/**
 * 로그인 사용자 조회(서버 검증 getUser)의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다.
 *
 * @description 인자 없는 `auth.getUser()`는 네트워크 왕복 내내 인증 lock을 쥐어, 같은 클라이언트의
 * 다른 조회(토큰을 읽으려고 lock을 기다림)가 그 응답 뒤로 밀린다. 토큰을 먼저 읽어 `getUser(jwt)`로
 * 넘기면 서버 검증은 그대로 하면서 lock을 쥐지 않는다. 세션이 없으면 기존 경로로 떨어진다.
 */
export const userQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions<UserResponse, Error>({
		queryFn: async () => {
			const { data } = await supabaseClient.auth.getSession();
			const accessToken = data.session?.access_token;

			if (!accessToken) {
				return new AuthService(supabaseClient).getUser();
			}

			return supabaseClient.auth.getUser(accessToken);
		},
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
