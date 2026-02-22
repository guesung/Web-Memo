import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { type ActiveUsersStats, AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useActiveUsersStatsQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: new AdminService(supabaseClient).getActiveUsersStats,
		queryKey: QUERY_KEY.activeUsersStats(),
		select: (response) => response.data as unknown as ActiveUsersStats,
	});

	return {
		...query,
		stats: query.data,
	};
}
