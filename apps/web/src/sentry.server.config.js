import { init } from "@sentry/nextjs";
import { createGrafanaSpanProcessors } from "./modules/observability/serverTracing";
import { SENTRY_COMMON_OPTIONS } from "./sentry.common.config";

const grafanaSpanProcessors = createGrafanaSpanProcessors();

init({
	...SENTRY_COMMON_OPTIONS,
	...(grafanaSpanProcessors.length > 0 && {
		openTelemetrySpanProcessors: grafanaSpanProcessors,
	}),
});
