import { init } from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	enabled: CONFIG.buildEnv !== "development",
	tracesSampleRate: 1.0,
});
