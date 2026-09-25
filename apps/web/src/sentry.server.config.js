import { init } from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	// CI의 E2E 서버와 로컬 개발은 next start의 NODE_ENV 때문에 production으로 찍혀 운영 이슈에 섞인다.
	// 빌드 대상 환경이 development면 보고하지 않는다.
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 1.0,
});
