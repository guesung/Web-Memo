"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
	ANALYTICS,
	ANALYTICS_EXCLUDED_STORAGE_KEY,
	ANALYTICS_EXCLUDED_USER_ID,
	QUERY_KEY,
} from "../../constants";
import { supabaseClientQueryOptions } from "../../hooks/supabase/queries/useSupabaseClientQuery";
import { userQueryOptions } from "../../hooks/supabase/queries/useSupabaseUserQuery";
import { SupabaseSessionRequiredError } from "../../utils/extension";
import { analytics } from "./Analytics";

/**
 * gtag가 자동 수집을 멈추게 하는 전역 플래그 이름.
 * @description gtag는 `window["ga-disable-<측정ID>"]`가 참이면 아무것도 보내지 않는다.
 */
const GA_DISABLE_KEY = `ga-disable-${ANALYTICS.gaId}`;

/**
 * 세션이 없어서 난 오류인지 본다.
 * @description 메시지("로그인을 먼저 해주세요")로 가리면 안 된다. 확장의 getSupabaseClient는 세션 복원 중
 * 네트워크·5xx 오류도 같은 메시지로 감싸 던지므로, 로그인한 사용자의 일시 장애가 로그아웃으로 읽혀
 * 저장된 user_id가 지워지고 제외 대상 계정의 이벤트까지 전송된다. 오류 타입으로만 판정한다.
 */
const isSessionMissingError = (error: unknown): boolean =>
	error instanceof SupabaseSessionRequiredError ||
	(error instanceof Error && error.name === "AuthSessionMissingError");

/** 로그아웃은 예상된 상태라 삼키고, 그 밖의 오류만 ErrorBoundary로 던져 지금처럼 보고되게 한다. */
const isUnexpectedError = (error: Error) => !isSessionMissingError(error);

/**
 * 로그인 사용자 id를 Suspense 없이 조회한다.
 *
 * @description 확장의 Supabase 클라이언트 조회는 로그아웃이면 SupabaseSessionRequiredError를 던진다.
 * Suspense 조회로 받으면 그 오류가 ErrorBoundary 폴백을 화면에 그리므로, 로그아웃은 `userId` 없이
 * 조회가 끝난 상태로 돌려준다. 같은 queryKey를 써서 다른 조회와 캐시·invalidate를 공유한다.
 */
const useTrackedUserId = () => {
	const clientQuery = useQuery({
		...supabaseClientQueryOptions(),
		throwOnError: isUnexpectedError,
	});
	const supabaseClient = clientQuery.data;
	const userQuery = useQuery({
		queryKey: QUERY_KEY.user(),
		queryFn: supabaseClient
			? userQueryOptions(supabaseClient).queryFn
			: skipToken,
		retry: false,
		throwOnError: isUnexpectedError,
	});

	return {
		// 세션 부재만 "사용자 없음"으로 확정한다. 그 밖의 오류에서는 저장된 user_id를 건드리지 않는다.
		isResolved:
			userQuery.isSuccess ||
			isSessionMissingError(clientQuery.error) ||
			isSessionMissingError(userQuery.error),
		userId: userQuery.data?.data?.user?.id,
	};
};

/** 로그인한 사용자를 analytics에 알리고, 만든 사람 본인이면 gtag 자동 수집을 끈다. 로그아웃이면 아무것도 그리지 않는다. */
export function AnalyticsUserTracking() {
	const { isResolved, userId } = useTrackedUserId();

	useEffect(() => {
		// 조회 중에 플래그를 지우면 제외 대상 사용자의 자동 수집이 잠깐 켜지므로, 결과가 나온 뒤에만 반영한다.
		if (!isResolved) {
			return;
		}

		analytics.setUserId(userId);

		if (typeof window === "undefined") {
			return;
		}

		const isExcluded = userId === ANALYTICS_EXCLUDED_USER_ID;
		(window as unknown as Record<string, boolean>)[GA_DISABLE_KEY] = isExcluded;

		try {
			if (isExcluded) {
				window.localStorage.setItem(ANALYTICS_EXCLUDED_STORAGE_KEY, "1");
				return;
			}

			window.localStorage.removeItem(ANALYTICS_EXCLUDED_STORAGE_KEY);
		} catch {
			// 사생활 보호 모드처럼 localStorage가 막힌 환경이면 이번 세션만 걸러진다.
		}
	}, [isResolved, userId]);

	return null;
}
