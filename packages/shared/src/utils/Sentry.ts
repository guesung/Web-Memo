import {
	browserProfilingIntegration,
	browserTracingIntegration,
	init,
	replayIntegration,
} from "@sentry/react";
import { SENTRY } from "../constants";
import { isExtension, isProduction } from "./Environment";

const SENTRY_DSN = isExtension() ? SENTRY.dsnExtension : SENTRY.dsnWeb;

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
