import * as Sentry from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";

Sentry.init({
	dsn: CONFIG.sentryDsnWeb,
	integrations: [Sentry.replayIntegration()],
	tracesSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
