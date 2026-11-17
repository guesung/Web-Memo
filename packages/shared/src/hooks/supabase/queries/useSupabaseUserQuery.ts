import type { UserResponse } from "@supabase/supabase-js";
import {
	queryOptions,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { AuthService } from "../../../utils";

import useMemoStoreQuery from "./useMemoStoreQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/** 비로그인(기기 저장소) 상태의 사용자 조회 결과. 사용자가 없다는 것이 정상 상태다. */
const GUEST_USER_RESPONSE = { data: { user: null }, error: null } as const;

/**
 * 로그인 사용자 조회(서버 검증 getUser)의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다.
 *
 * @description 인자 없는 `auth.getUser()`는 네트워크 왕복 내내 인증 lock을 쥐어, 같은 클라이언트의
 * 다른 조회(토큰을 읽으려고 lock을 기다림)가 그 응답 뒤로 밀린다. 토큰을 먼저 읽어 `getUser(jwt)`로
 * 넘기면 서버 검증은 그대로 하면서 lock을 쥐지 않는다. 세션이 없으면 기존 경로로 떨어진다.
 */
const fetchUser = async (supabaseClient: MemoSupabaseClient) => {
	const { data } = await supabaseClient.auth.getSession();
	const accessToken = data.session?.access_token;

	if (!accessToken) {
		return new AuthService(supabaseClient).getUser();
	}

	return supabaseClient.auth.getUser(accessToken);
};

export const userQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions<UserResponse, Error>({
		queryFn: () => fetchUser(supabaseClient),
		queryKey: QUERY_KEY.user(),
		retry: false,
	});

/**
 * 현재 사용자를 조회한다.
 * @description 확장에서 세션이 없어 기기 저장소를 쓰는 동안에는 던지지 않고 사용자 없음(`user.data.user === null`)을
 * 돌려준다. 서버 조회와 캐시가 섞이지 않도록 키를 따로 둔다.
 */
export default function useSupabaseUserQuery() {
	const queryClient = useQueryClient();
	const { data: memoStore } = useMemoStoreQuery();
	const isGuest = memoStore.kind === "local";

	const query = useSuspenseQuery({
		queryKey: isGuest ? [...QUERY_KEY.user(), "guest"] : QUERY_KEY.user(),
		queryFn: async (): Promise<UserResponse | typeof GUEST_USER_RESPONSE> => {
			if (isGuest) {
				return GUEST_USER_RESPONSE;
			}

			return fetchUser(
				await queryClient.ensureQueryData(supabaseClientQueryOptions()),
			);
		},
		retry: false,
		// 기기 저장소 상태의 빈 결과는 네트워크가 필요 없다. 기본값이면 오프라인에서 Suspense가 풀리지 않는다.
		networkMode: isGuest ? "always" : "online",
	});

	return {
		...query,
		user: query.data,
	};
}
