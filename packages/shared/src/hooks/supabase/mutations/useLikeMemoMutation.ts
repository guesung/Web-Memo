import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { LikeService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	memoId: number;
	userId: string;
};
type MutationData = Awaited<ReturnType<LikeService["likeMemo"]>>;
type MutationError = Error;

export default function useLikeMemoMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ memoId, userId }) =>
			new LikeService(supabaseClient).likeMemo(memoId, userId),
		onSuccess: (_, { memoId }) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.publicMemo(memoId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.communityMemos(),
			});
		},
	});
}
