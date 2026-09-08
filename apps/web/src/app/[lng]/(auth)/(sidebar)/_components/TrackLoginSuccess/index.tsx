"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** 로그인 성공 직후 콜백 라우트가 붙이는 쿼리 파라미터. 값은 로그인 수단입니다. */
const LOGIN_METHOD_PARAM = "login";
/** 신규 가입일 때만 붙는 쿼리 파라미터. */
const SIGN_UP_PARAM = "signup";

/**
 * 로그인 성공을 한 번 기록합니다.
 * @description 로그인 자체는 서버 액션과 서버 라우트에서 끝나 gtag가 닿지 않습니다.
 * 그래서 콜백이 리다이렉트에 로그인 수단을 실어 보내고, 도착한 클라이언트가 대신 찍습니다.
 * 찍은 뒤 파라미터를 지웁니다. 남겨두면 새로고침할 때마다 다시 찍힙니다.
 */
export default function TrackLoginSuccess() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const loginMethod = searchParams.get(LOGIN_METHOD_PARAM);

		if (!loginMethod) return;

		// 신규 가입은 로그인과 따로 셉니다. 재로그인과 섞이면 퍼널 전환율이 나오지 않습니다.
		if (searchParams.get(SIGN_UP_PARAM) === "true") {
			analytics.trackEvent({
				name: "sign_up",
				params: { method: loginMethod },
			});
		}

		analytics.trackEvent({ name: "login", params: { method: loginMethod } });

		const nextSearchParams = new URLSearchParams(searchParams.toString());
		nextSearchParams.delete(LOGIN_METHOD_PARAM);
		nextSearchParams.delete(SIGN_UP_PARAM);

		const query = nextSearchParams.toString();
		router.replace(query ? `${pathname}?${query}` : pathname);
	}, [searchParams, pathname, router]);

	return null;
}
