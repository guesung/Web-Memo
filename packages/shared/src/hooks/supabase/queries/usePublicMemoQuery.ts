import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CommunityService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function usePublicMemoQuery(id: number) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const communityService = new CommunityService(supabaseClient);

	return useSuspenseQuery({
		queryKey: QUERY_KEY.publicMemo(id),
		queryFn: async () => {
			const { data, error } = await communityService.getPublicMemoById(id);
			if (error) {
				throw error;
			}
			return data;
		},
	});
}
