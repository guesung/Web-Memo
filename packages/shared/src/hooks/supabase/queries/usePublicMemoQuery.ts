import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CommunityService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";
import useSupabaseUserQuery from "./useSupabaseUserQuery";

export default function usePublicMemoQuery(id: number) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { data: userResponse } = useSupabaseUserQuery();
	const currentUserId = userResponse?.data?.user?.id;
	const communityService = new CommunityService(supabaseClient);

	return useQuery({
		queryKey: QUERY_KEY.publicMemo(id, currentUserId),
		queryFn: async () => {
			const { data, error } = await communityService.getPublicMemoById(id, currentUserId);
			if (error) {
				throw error;
			}
			return data;
		},
	});
}
