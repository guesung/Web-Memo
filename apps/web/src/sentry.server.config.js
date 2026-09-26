import { init } from "@sentry/nextjs";
import { SENTRY_COMMON_OPTIONS } from "./sentry.common.config";

init(SENTRY_COMMON_OPTIONS);
