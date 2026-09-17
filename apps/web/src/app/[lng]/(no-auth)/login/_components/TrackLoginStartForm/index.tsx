"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import type { MouseEvent, PropsWithChildren } from "react";

/** 로그인 버튼이 어느 수단인지 알리는 data 속성. */
const LOGIN_METHOD_ATTRIBUTE = "data-login-method";

/**
 * 로그인 시도를 기록하는 form입니다.
 * @description 로그인 버튼은 formAction에 서버 액션이 묶여 있어 버튼 자체를 클라이언트
 * 컴포넌트로 만들 수 없습니다. form만 클라이언트로 감싸고 클릭을 캡처해, 서버 액션은
 * 그대로 두면서 어느 수단을 눌렀는지만 남깁니다.
 *
 * 로그인 페이지까지 왔는데 버튼을 누르지 않고 떠난 사람을 세려면 이 지점이 필요합니다.
 */
export default function TrackLoginStartForm({
	children,
	className,
}: PropsWithChildren<{ className?: string }>) {
	const handleFormClickCapture = (event: MouseEvent<HTMLFormElement>) => {
		const target = event.target as HTMLElement;
		const button = target.closest(`button[${LOGIN_METHOD_ATTRIBUTE}]`);

		if (!button) return;

		const method = button.getAttribute(LOGIN_METHOD_ATTRIBUTE);

		if (!method) return;

		analytics.trackEvent({ name: "login_start", params: { method } });
	};

	return (
		<form className={className} onClickCapture={handleFormClickCapture}>
			{children}
		</form>
	);
}
