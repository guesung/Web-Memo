import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { ProfileService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useProfileWithStatsQuery(userId: string) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const profileService = new ProfileService(supabaseClient);

	return useSuspenseQuery({
		queryKey: QUERY_KEY.profileWithStats(userId),
		queryFn: async () => {
			const { data, error } = await profileService.getProfileWithStats(userId);
			if (error) {
				throw error;
			}
			return data?.[0] ?? null;
		},
	});
}
