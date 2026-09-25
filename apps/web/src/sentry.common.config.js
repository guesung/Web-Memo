import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

/**
 * 서버(Node.js)와 Edge 런타임이 함께 쓰는 Sentry 옵션.
 *
 * @description 런타임별 파일은 나눠 둔다. Edge 번들에 Node 전용 옵션이 섞이지 않게 하려는 것이라,
 * 한쪽에만 필요한 옵션은 여기가 아니라 해당 런타임 파일에 추가한다.
 */
export const SENTRY_COMMON_OPTIONS = {
	dsn: SENTRY.dsnWeb,
	// CI의 E2E 서버와 로컬 개발은 next start의 NODE_ENV 때문에 production으로 찍혀 운영 이슈에 섞인다.
	// 빌드 대상 환경이 development면 보고하지 않는다.
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 0.1,
};
