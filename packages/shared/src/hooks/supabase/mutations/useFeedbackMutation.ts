import { useMutation } from "@tanstack/react-query";
import { analytics } from "../../../modules/analytics";
import type { FeedbackTable } from "../../../types";
import { FeedbackService } from "../../../utils";
import { useSupabaseFeedbackClientQuery } from "../queries";

/** 피드백 저장 요청. `feedbackType`은 분석 이벤트에만 쓰이고 DB에는 저장되지 않는다. */
export type TFeedbackMutationVariables = FeedbackTable["Insert"] & {
	/** 피드백이 들어온 경로. 생략하면 "general" */
	feedbackType?: "general" | "uninstall";
};

/** 피드백이 들어온 페이지의 경로. 쿼리스트링·해시는 제외하며, 브라우저가 아니면 null */
const getCurrentPathname = () =>
	typeof window !== "undefined" ? window.location.pathname : null;

/** 피드백을 저장하고 `feedback_submit` 이벤트를 남기는 뮤테이션 훅. */
export default function useFeedbackMutation() {
	const { data: supabaseClient } = useSupabaseFeedbackClientQuery();

	return useMutation({
		meta: {
			feature: "feedback",
			operation: "create",
			stage: "save",
		},
		mutationFn: ({ feedbackType, ...feedback }: TFeedbackMutationVariables) =>
			new FeedbackService(supabaseClient).insertFeedback({
				source_path: getCurrentPathname(),
				...feedback,
			}),
		onSuccess: (_data, variables) => {
			analytics.trackEvent({
				name: "feedback_submit",
				params: { feedback_type: variables.feedbackType ?? "general" },
			});
		},
	});
}
