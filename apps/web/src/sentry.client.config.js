import { init } from "@sentry/nextjs";
import { SENTRY } from "@web-memo/shared/constants";

init({
	dsn: SENTRY.dsnWeb,
	tracesSampleRate: 1.0,
});
