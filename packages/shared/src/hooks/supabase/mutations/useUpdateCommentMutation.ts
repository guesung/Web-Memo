import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { CommentService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	commentId: number;
	memoId: number;
	content: string;
};
type MutationData = Awaited<ReturnType<CommentService["updateComment"]>>;
type MutationError = Error;

export default function useUpdateCommentMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ commentId, content }) =>
			new CommentService(supabaseClient).updateComment({
				commentId,
				content,
			}),
		onSuccess: (_, { memoId }) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memoComments(memoId),
			});
		},
	});
}
