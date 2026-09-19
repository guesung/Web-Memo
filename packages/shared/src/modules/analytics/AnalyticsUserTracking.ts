"use client";

import { useEffect } from "react";
import { ANALYTICS, ANALYTICS_EXCLUDED_USER_ID } from "../../constants";
import useSupabaseUserQuery from "../../hooks/supabase/queries/useSupabaseUserQuery";
import { analytics } from "./Analytics";

/**
 * gtag가 자동 수집을 멈추게 하는 전역 플래그 이름.
 * @description gtag는 `window["ga-disable-<측정ID>"]`가 참이면 아무것도 보내지 않는다.
 */
const GA_DISABLE_KEY = `ga-disable-${ANALYTICS.gaId}`;

/**
 * 다음 방문 때 gtag가 뜨기 전에 읽는 표식.
 * @description 로그인 여부는 세션을 복원한 뒤에야 알 수 있는데, 그때는 gtag가 이미
 * page_view를 보낸 뒤다. 한 번 관리자로 확인되면 이 표식을 남겨 두고, 다음 방문부터는
 * 레이아웃의 선행 스크립트가 gtag보다 먼저 전역 플래그를 켠다.
 */
export const ANALYTICS_EXCLUDED_STORAGE_KEY = "analyticsExcluded";

/** 로그인한 사용자를 analytics에 알리고, 만든 사람 본인이면 gtag 자동 수집을 끈다. */
export function AnalyticsUserTracking() {
	const { user } = useSupabaseUserQuery();

	useEffect(() => {
		const userId = user?.data?.user?.id;
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
	}, [user]);

	return null;
}
