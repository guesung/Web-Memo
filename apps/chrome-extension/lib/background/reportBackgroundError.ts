import { captureException } from "@sentry/react";
import { createErrorReporter } from "@web-memo/shared/utils";

/** background(service worker)의 오류 리포터. 메모와 하이라이트가 같은 중복 억제 기록을 공유한다. */
export const reportBackgroundError = createErrorReporter({
	capture: captureException,
});
