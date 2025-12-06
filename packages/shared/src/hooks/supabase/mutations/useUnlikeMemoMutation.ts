import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { LikeService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	memoId: number;
	userId: string;
};
type MutationData = Awaited<ReturnType<LikeService["unlikeMemo"]>>;
type MutationError = Error;

export default function useUnlikeMemoMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ memoId, userId }) =>
			new LikeService(supabaseClient).unlikeMemo(memoId, userId),
		onSuccess: (_, { memoId }) => {
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey[0] === "community" &&
					query.queryKey[1] === "memo" &&
					query.queryKey[2] === memoId,
			});
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey[0] === "community" &&
					query.queryKey[1] === "memos",
			});
		},
	});
}
