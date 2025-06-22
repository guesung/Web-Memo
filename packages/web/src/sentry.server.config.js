import { CONFIG } from "@extension/env";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: CONFIG.sentryDsnWeb,
	tracesSampleRate: 1.0,
});
