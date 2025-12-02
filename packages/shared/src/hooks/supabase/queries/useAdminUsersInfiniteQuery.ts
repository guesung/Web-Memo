import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService, type AdminUsersResponse } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

const PAGE_SIZE = 20;

interface UseAdminUsersInfiniteQueryParams {
	searchQuery?: string;
}

export default function useAdminUsersInfiniteQuery({
	searchQuery,
}: UseAdminUsersInfiniteQueryParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseInfiniteQuery({
		queryKey: QUERY_KEY.adminUsers(searchQuery),
		queryFn: ({ pageParam = 0 }) =>
			new AdminService(supabaseClient).getUsers({
				searchQuery,
				pageSize: PAGE_SIZE,
				pageOffset: pageParam,
			}),
		getNextPageParam: (lastPage, allPages) => {
			const data = lastPage?.data as unknown as AdminUsersResponse | undefined;
			if (!data || !allPages) return undefined;
			const loadedCount = allPages.length * PAGE_SIZE;
			return loadedCount < data.totalCount ? loadedCount : undefined;
		},
		initialPageParam: 0,
	});

	const users =
		query.data?.pages.flatMap(
			(page) => (page.data as unknown as AdminUsersResponse).users,
		) ?? [];

	const totalCount =
		(query.data?.pages[0]?.data as unknown as AdminUsersResponse)?.totalCount ??
		0;

	return {
		...query,
		users,
		totalCount,
	};
}
