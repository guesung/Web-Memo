import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CommentService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	memoId: number;
	userId: string;
	content: string;
};
type MutationData = Awaited<ReturnType<CommentService["createComment"]>>;
type MutationError = Error;

export default function useCreateCommentMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ memoId, userId, content }) =>
			new CommentService(supabaseClient).createComment({
				memoId,
				userId,
				content,
			}),
		onSuccess: (_, { memoId }) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memoComments(memoId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.publicMemo(memoId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.communityMemos(),
			});
		},
	});
}
