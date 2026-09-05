import { useMutation } from "@tanstack/react-query";
import { analytics } from "../../../modules/analytics";
import { AuthService } from "../../../utils/Supabase";
import { useSupabaseClientQuery } from "../queries";

export default function useSignoutMutation() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new AuthService(supabaseClient).signout,
		onSuccess: () => {
			analytics.trackEvent({ name: "logout" });
		},
	});
}
