import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	AdminService,
	type AdminStats,
	type IFAdminStatsParams,
} from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 대시보드 통계를 읽는다. `includeAdmin`은 쿼리 키에도 들어가 값이 바뀌면 재조회한다. */
export default function useAdminStatsQuery({
	includeAdmin = false,
}: IFAdminStatsParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () =>
			new AdminService(supabaseClient).getAdminStats({ includeAdmin }),
		queryKey: QUERY_KEY.adminStats(includeAdmin),
		select: (response) => response.data as unknown as AdminStats,
	});

	return {
		...query,
		stats: query.data,
	};
}
