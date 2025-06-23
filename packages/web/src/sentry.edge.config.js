import {init} from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";

init({
	dsn: CONFIG.sentryDsnWeb,
	tracesSampleRate: 0.1,
});
