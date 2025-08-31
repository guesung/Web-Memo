import { init } from "@sentry/nextjs";
import { CLIENT_CONFIG } from "@web-memo/env";

init({
	dsn: CLIENT_CONFIG.sentryDsnWeb,
	integrations: [Sentry.replayIntegration()],
	tracesSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
