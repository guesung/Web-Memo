import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoRetentionParams } from "../../../types";
import { AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useMemoRetentionQuery({
	range = "recent12",
	granularity = "month",
}: MemoRetentionParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useQuery({
		queryKey: QUERY_KEY.memoRetention(range, granularity),
		queryFn: () =>
			new AdminService(supabaseClient).getMemoRetentionStats({
				range,
				granularity,
			}),
		retry: false,
	});
}
