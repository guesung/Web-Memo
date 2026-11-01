interface IFClientExceptionEvent {
	exception?: {
		values?: {
			type?: string;
			value?: string;
			mechanism?: { type?: string };
		}[];
	};
}

/**
 * supabase-js가 자동 등록한 onAuthStateChange가 auth-js 락 획득 타임아웃 때
 * catch 없이 흘리는 AbortError라 사용자 영향 없는 노이즈다.
 */
const isUnhandledSupabaseAbortError = (
	event: IFClientExceptionEvent,
): boolean => {
	const exception = event.exception?.values?.[0];

	return (
		exception?.type === "AbortError" &&
		exception.value === "signal is aborted without reason" &&
		exception.mechanism?.type ===
			"auto.browser.global_handlers.onunhandledrejection"
	);
};

/**
 * Talisman 등 암호화폐 지갑 브라우저 확장이 모든 페이지에 주입하는 스크립트가
 * 자체 온보딩을 마치지 못했을 때 던지는 오류다. 우리 코드·사용자 영향과 무관한
 * 노이즈라 버린다.
 */
const isWalletExtensionOnboardingNoise = (
	event: IFClientExceptionEvent,
): boolean => {
	const exception = event.exception?.values?.[0];

	return (
		exception?.value ===
		"Talisman extension has not been configured yet. Please continue with onboarding."
	);
};

/** 사용자 영향 없는 노이즈 이벤트면 true다. `beforeSend`에서 true면 null을 반환해 버린다. */
export const shouldDropWebClientEvent = (
	event: IFClientExceptionEvent,
): boolean =>
	isUnhandledSupabaseAbortError(event) ||
	isWalletExtensionOnboardingNoise(event);
