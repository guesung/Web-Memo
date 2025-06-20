import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { isExtension } from "../../../utils/Environment";
import { getSupabaseClient as getSupabaseClientExtension } from "../../../utils/extension";
import { getSupabaseClient as getSupabaseClientWeb } from "../../../utils/web";

export default function useSupabaseClientQuery() {
	const query = useSuspenseQuery({
		queryFn: isExtension ? getSupabaseClientExtension : getSupabaseClientWeb,
		queryKey: QUERY_KEY.supabaseClient(),
	});

	return {
		...query,
		data: query.data as MemoSupabaseClient,
	};
}
