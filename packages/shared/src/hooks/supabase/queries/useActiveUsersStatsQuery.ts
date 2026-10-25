import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	type ActiveUsersStats,
	AdminService,
	type IFAdminStatsParams,
} from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 대시보드 통계를 읽는다. `includeAdmin`은 쿼리 키에도 들어가 값이 바뀌면 재조회한다. */
export default function useActiveUsersStatsQuery({
	includeAdmin = false,
}: IFAdminStatsParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () =>
			new AdminService(supabaseClient).getActiveUsersStats({ includeAdmin }),
		queryKey: QUERY_KEY.activeUsersStats(includeAdmin),
		select: (response) => response.data as unknown as ActiveUsersStats,
	});

	return {
		...query,
		stats: query.data,
	};
}
