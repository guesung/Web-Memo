import { useMutation } from "@tanstack/react-query";
import { analytics } from "../../../modules/analytics";
import { FeedbackService } from "../../../utils";
import { useSupabaseFeedbackClientQuery } from "../queries";

export default function useFeedbackMutation() {
	const { data: supabaseClient } = useSupabaseFeedbackClientQuery();

	return useMutation({
		mutationFn: new FeedbackService(supabaseClient).insertFeedback,
		onSuccess: () => {
			analytics.trackEvent({ name: "feedback_submit" });
		},
	});
}
