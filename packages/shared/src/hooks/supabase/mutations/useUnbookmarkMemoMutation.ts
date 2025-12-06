import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { BookmarkService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	memoId: number;
	userId: string;
};
type MutationData = Awaited<ReturnType<BookmarkService["unbookmarkMemo"]>>;
type MutationError = Error;

export default function useUnbookmarkMemoMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ memoId, userId }) =>
			new BookmarkService(supabaseClient).unbookmarkMemo(memoId, userId),
		onSuccess: (_, { memoId, userId }) => {
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
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.bookmarkedMemos(userId),
			});
		},
	});
}
