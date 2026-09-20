import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 1.0,
});

/**
 * 라우터 이동을 Sentry 트랜잭션으로 계측한다.
 *
 * @description Next는 `instrumentation-client.ts`에서 이 이름의 export를 찾아 이동이 시작될 때 호출한다.
 */
export const onRouterTransitionStart = captureRouterTransitionStart;
