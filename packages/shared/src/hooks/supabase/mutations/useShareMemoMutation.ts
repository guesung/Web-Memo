import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoRow } from "../../../types";
import { CommunityService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	id: MemoRow["id"];
};
type MutationData = Awaited<ReturnType<CommunityService["shareMemo"]>>;
type MutationError = Error;

export default function useShareMemoMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ id }) => new CommunityService(supabaseClient).shareMemo(id),
		onSuccess: async ({ data }) => {
			const memoId = data?.[0]?.id;
			if (memoId) {
				queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memo({ id: memoId }),
				});
			}
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memos(),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.communityMemos(),
			});
		},
	});
}
