import { captureException, flush } from "@sentry/nextjs";
import { runAfterResponse } from "@src/modules/slack/afterResponse";
import {
	createErrorReporter,
	type TErrorReportLevel,
} from "@web-memo/shared/utils";

const reportPastMemoError = createErrorReporter({
	capture: (error, context) => {
		captureException(error, context);
		// 응답을 보낸 뒤 함수가 멈춰도 이벤트가 사라지지 않도록 flush를 응답 뒤로 미룬다.
		void runAfterResponse(async () => {
			await flush(2000);
		});
	},
});

/**
 * 과거 메모 판정의 실패를 Sentry에 보고한다.
 * @description 판정은 실패해도 빈 결과로 끝나므로(fail-open) 사용자는 모른다. 여기서 보고하지 않으면 아무도 모른다.
 */
export const reportPastMemoFailure = ({
	error,
	stage,
	level = "error",
}: {
	error: unknown;
	/** 실패한 단계. 예: `auth`, `ratelimit`, `fetch-memos`, `jev` */
	stage: string;
	level?: TErrorReportLevel;
}): void => {
	reportPastMemoError({
		error,
		feature: "past-memo",
		operation: "judge",
		stage,
		level,
	});
};
