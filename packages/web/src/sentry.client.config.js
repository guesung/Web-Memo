import { CONFIG } from "@extension/shared/constants";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: CONFIG.sentryDsnWeb,
	integrations: [Sentry.replayIntegration()],
	tracesSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
