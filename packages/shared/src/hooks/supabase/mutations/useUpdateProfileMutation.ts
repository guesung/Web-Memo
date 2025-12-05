import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { ProfilesUpdate } from "../../../types";
import { ProfileService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	userId: string;
	data: ProfilesUpdate;
};
type MutationData = Awaited<ReturnType<ProfileService["updateProfile"]>>;
type MutationError = Error;

export default function useUpdateProfileMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: ({ userId, data }) =>
			new ProfileService(supabaseClient).updateProfile(userId, data),
		onSuccess: async (_, { userId }) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.profile(userId),
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.profileWithStats(userId),
			});
		},
	});
}
