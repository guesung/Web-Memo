import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import {
	initializeMemoObservability,
	startMemoNavigation,
} from "@src/modules/observability/client";
import { shouldDropWebClientEvent } from "@src/modules/sentry/webClientFilters";
import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 1.0,
	beforeSend: (event) => (shouldDropWebClientEvent(event) ? null : event),
});

initializeMemoObservability();

/** Next 라우터 이동의 시작 시각을 Sentry와 메모 지연 계측에 전달한다. */
export const onRouterTransitionStart = (
	...args: Parameters<typeof captureRouterTransitionStart>
): void => {
	captureRouterTransitionStart(...args);
	startMemoNavigation(args[0]);
};
