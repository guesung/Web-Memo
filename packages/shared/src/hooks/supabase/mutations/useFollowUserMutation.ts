import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { FollowService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	followerId: string;
	followingId: string;
};
type MutationData = Awaited<ReturnType<FollowService["followUser"]>>;
type MutationError = Error;

export default function useFollowUserMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ followerId, followingId }) =>
			new FollowService(supabaseClient).followUser(followerId, followingId),
		onSuccess: (_, { followerId, followingId }) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.profileWithStats(followingId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.profileWithStats(followerId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.followers(followingId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.following(followerId),
			});
		},
	});
}
