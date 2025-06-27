import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { FeedbackSupabaseClient } from "../../../types";
import { isExtension } from "../../../utils/Environment";
import { getFeedbackSupabaseClient as getSupabaseClientExtension } from "../../../utils/extension";
import { getFeedbackSupabaseClient as getFeedbackSupabaseClientWeb } from "../../../utils/web";

export default function useSupabaseFeedbackClientQuery() {
	const query = useQuery({
		queryFn: isExtension()
			? getSupabaseClientExtension
			: getFeedbackSupabaseClientWeb,
		queryKey: QUERY_KEY.supabaseClient(),
	});

	return {
		...query,
		data: query.data as FeedbackSupabaseClient,
	};
}
