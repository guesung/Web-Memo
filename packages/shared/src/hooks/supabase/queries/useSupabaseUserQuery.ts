import type { UserResponse } from "@supabase/supabase-js";
import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AuthService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useSupabaseUserQuery() {
	const { data: supabaseClient, refetch: refetchSupabaseClient } =
		useSupabaseClientQuery();

	const query = useSuspenseQuery<UserResponse, Error>({
		queryFn: new AuthService(supabaseClient).getUser,
		queryKey: QUERY_KEY.user(),
		retry: false,
	});

	return {
		...query,
		user: query.data,
		refetchSupabaseClient,
	};
}
