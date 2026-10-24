import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import {
	initializeMemoObservability,
	startMemoNavigation,
} from "@src/modules/observability/client";
import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 1.0,
	// supabase-js가 자동 등록한 onAuthStateChange가 auth-js 락 획득 타임아웃 때 catch 없이 흘리는 AbortError라 사용자 영향 없는 노이즈다.
	beforeSend: (event) => {
		const exception = event.exception?.values?.[0];

		const isUnhandledAbortError =
			exception?.type === "AbortError" &&
			exception.value === "signal is aborted without reason" &&
			exception.mechanism?.type ===
				"auto.browser.global_handlers.onunhandledrejection";

		if (isUnhandledAbortError) {
			return null;
		}

		return event;
	},
});

initializeMemoObservability();

/** Next 라우터 이동의 시작 시각을 Sentry와 메모 지연 계측에 전달한다. */
export const onRouterTransitionStart = (
	...args: Parameters<typeof captureRouterTransitionStart>
): void => {
	captureRouterTransitionStart(...args);
	startMemoNavigation(args[0]);
};
