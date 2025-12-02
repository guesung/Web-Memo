import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService, type UserGrowthData } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useUserGrowthQuery(days: number = 30) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () => new AdminService(supabaseClient).getUserGrowth(days),
		queryKey: QUERY_KEY.userGrowth(days),
		select: (response) =>
			(response.data as unknown as UserGrowthData[]) ?? [],
	});

	return {
		...query,
		growthData: query.data,
	};
}
