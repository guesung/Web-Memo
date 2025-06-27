import { useMutation } from "@tanstack/react-query";
import { FeedbackService } from "../../../utils";

import { useSupabaseFeedbackClientQuery } from "../queries";

export default function useFeedbackMutation() {
	const { data: supabaseClient } = useSupabaseFeedbackClientQuery();

	return useMutation({
		mutationFn: new FeedbackService(supabaseClient).insertFeedback,
	});
}
