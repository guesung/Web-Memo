import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService, type AdminStats } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useAdminStatsQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: new AdminService(supabaseClient).getAdminStats,
		queryKey: QUERY_KEY.adminStats(),
		select: (response) => response.data as unknown as AdminStats,
	});

	return {
		...query,
		stats: query.data,
	};
}
