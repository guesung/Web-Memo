import {
	browserProfilingIntegration,
	browserTracingIntegration,
	init,
} from "@sentry/react";
import { SENTRY } from "../constants";
import { isExtension, isProduction } from "./Environment";

const SENTRY_DSN = isExtension() ? SENTRY.dsnExtension : SENTRY.dsnWeb;

export const initSentry = async () => {
	if (!isProduction()) return;

	init({
		dsn: SENTRY_DSN,
		integrations: [browserTracingIntegration(), browserProfilingIntegration()],

		tracesSampleRate: isExtension() ? 1.0 : 0,
		release: "0.3.1",
	});
};
