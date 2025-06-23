import * as Sentry from "@sentry/react";
import { CONFIG } from "@web-memo/env";
import { isExtension, isProduction } from "./Environment";

const SENTRY_DSN = isExtension ? CONFIG.sentryDsnExtension : CONFIG.sentryDsnWeb;

export const testSentry = () => {
	Sentry.captureException(new Error(`captureException Error 테스트`));
	Sentry.captureException(`captureException String 테스트1`);
	Sentry.captureMessage(`captureMessage 테스트2`);
};

export const initSentry = async () => {
	if (!isProduction) return;

	Sentry.init({
		dsn: SENTRY_DSN,
		integrations: [
			Sentry.browserTracingIntegration(),
			Sentry.replayIntegration(),
			Sentry.browserProfilingIntegration(),
		],

		tracesSampleRate: isExtension ? 1.0 : 0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		release: "0.3.1",
	});
};
