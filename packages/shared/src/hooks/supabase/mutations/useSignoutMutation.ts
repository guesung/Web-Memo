import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import { AuthService } from "../../../utils/Supabase";
import { useSupabaseClientQuery } from "../queries";

export default function useSignoutMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		meta: {
			feature: "auth",
			operation: "signout",
			stage: "request",
		},
		mutationFn: new AuthService(supabaseClient).signout,
		onSuccess: () => {
			// 다른 계정이 로그인해도 이전 계정의 구독·완료 현황이 남지 않게 한다.
			queryClient.removeQueries({ queryKey: QUERY_KEY.blogCompletionPrefix() });
			analytics.trackEvent({ name: "logout" });
		},
	});
}
