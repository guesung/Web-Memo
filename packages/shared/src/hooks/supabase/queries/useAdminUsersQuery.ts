import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	AdminService,
	type AdminUsersResponse,
	type GetAdminUsersParams,
} from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useAdminUsersQuery(params: GetAdminUsersParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () => new AdminService(supabaseClient).getUsers(params),
		queryKey: QUERY_KEY.adminUsers(params.searchQuery),
		select: (response) => response.data as unknown as AdminUsersResponse,
	});

	return {
		...query,
		users: query.data?.users ?? [],
		totalCount: query.data?.totalCount ?? 0,
	};
}
