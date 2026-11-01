import { FunctionsHttpError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { useSupabaseClientQuery } from "../queries";

const RATE_LIMITED_STATUS = 429;

export type TWeeklyReportTestFailureReason = "rate_limited" | "failed";

/** 테스트 메일 발송 실패. 화면이 문구를 고를 수 있게 사유만 구분해 담는다. */
export class WeeklyReportTestError extends Error {
	reason: TWeeklyReportTestFailureReason;

	constructor(reason: TWeeklyReportTestFailureReason, options?: ErrorOptions) {
		super(`weekly report test mail failed: ${reason}`, options);
		this.name = "WeeklyReportTestError";
		this.reason = reason;
	}
}

const toWeeklyReportTestError = (error: unknown) => {
	const isRateLimited =
		error instanceof FunctionsHttpError &&
		error.context instanceof Response &&
		error.context.status === RATE_LIMITED_STATUS;

	return new WeeklyReportTestError(isRateLimited ? "rate_limited" : "failed", {
		cause: error,
	});
};

/** 이번 주 리포트를 로그인 계정의 저장된 주소로 한 통 보내 보고, 발송된 주소를 돌려준다. */
export default function useWeeklyReportTestMutation() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		meta: {
			feature: "weekly-report",
			operation: "send-test",
			stage: "request",
		},
		mutationFn: async () => {
			const { data, error } = await supabaseClient.functions.invoke<{
				email: string;
			}>("weekly-memo-report", { body: { mode: "test" } });

			if (error || !data) {
				throw toWeeklyReportTestError(error);
			}

			return { email: data.email };
		},
	});
}
