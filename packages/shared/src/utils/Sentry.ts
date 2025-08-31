import {
	browserProfilingIntegration,
	browserTracingIntegration,
	captureException,
	captureMessage,
	init,
	replayIntegration,
} from "@sentry/react";
import { CLIENT_CONFIG } from "@web-memo/env";
import { isExtension, isProduction } from "./Environment";

const SENTRY_DSN = isExtension()
	? CLIENT_CONFIG.sentryDsnExtension
	: CLIENT_CONFIG.sentryDsnWeb;

export const testSentry = () => {
	captureException(new Error(`captureException Error 테스트`));
	captureException(`captureException String 테스트1`);
	captureMessage(`captureMessage 테스트2`);
};

export const initSentry = async () => {
	if (!isProduction()) return;

	init({
		dsn: SENTRY_DSN,
		integrations: [
			browserTracingIntegration(),
			replayIntegration(),
			browserProfilingIntegration(),
		],

		tracesSampleRate: isExtension() ? 1.0 : 0,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		release: "0.3.1",
	});
};
