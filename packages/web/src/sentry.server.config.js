import { init } from "@sentry/nextjs";
import { CLIENT_CONFIG } from "@web-memo/env";

init({
	dsn: CLIENT_CONFIG.sentryDsnWeb,
	tracesSampleRate: 0.1,
});
