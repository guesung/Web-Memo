import * as Sentry from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";

Sentry.init({
	dsn: CONFIG.sentryDsnWeb,
	tracesSampleRate: 0.1,
});
