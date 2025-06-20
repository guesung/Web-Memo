import { QUERY_KEY } from "@src/constants";
import type { FeedbackSupabaseClient } from "@src/types";
import { isExtension } from "@src/utils/Environment";
import { getFeedbackSupabaseClient as getSupabaseClientExtension } from "@src/utils/extension";
import { getFeedbackSupabaseClient as getFeedbackSupabaseClientWeb } from "@src/utils/web";
import { useQuery } from "@tanstack/react-query";

export default function useSupabaseFeedbackClientQuery() {
	const query = useQuery({
		queryFn: isExtension
			? getSupabaseClientExtension
			: getFeedbackSupabaseClientWeb,
		queryKey: QUERY_KEY.supabaseClient(),
	});

	return {
		...query,
		data: query.data as FeedbackSupabaseClient,
	};
}
