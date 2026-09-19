import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService, type UserGrowthData } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 사용자 증가 추이 훅 인자 */
interface IFUseUserGrowthQueryParams {
	days?: number;
	includeAdmin?: boolean;
}

/** 사용자 증가 추이를 읽는다. `includeAdmin`은 쿼리 키에도 들어가 값이 바뀌면 재조회한다. */
export default function useUserGrowthQuery({
	days = 30,
	includeAdmin = false,
}: IFUseUserGrowthQueryParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () =>
			new AdminService(supabaseClient).getUserGrowth({
				daysAgo: days,
				includeAdmin,
			}),
		queryKey: QUERY_KEY.userGrowth(days, includeAdmin),
		select: (response) => (response.data as unknown as UserGrowthData[]) ?? [],
	});

	return {
		...query,
		growthData: query.data,
	};
}
