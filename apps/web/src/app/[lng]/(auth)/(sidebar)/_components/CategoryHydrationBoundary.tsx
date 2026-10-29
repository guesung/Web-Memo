import { getQueryClient } from "@src/utils";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { MemoSupabaseClient } from "@web-memo/shared/types";
import { CategoryService } from "@web-memo/shared/utils";
import type { PropsWithChildren } from "react";

interface CategoryHydrationBoundaryProps extends PropsWithChildren {
	supabaseClient: MemoSupabaseClient;
}

/** 카테고리 조회를 시작하고 sidebar와 main에 같은 pending query를 전달한다. */
export default function CategoryHydrationBoundary({
	children,
	supabaseClient,
}: CategoryHydrationBoundaryProps) {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery({
		queryKey: QUERY_KEY.category(),
		queryFn: new CategoryService(supabaseClient).getCategories,
		staleTime: 1000 * 60 * 5,
	});

	return (
		<HydrationBoundary
			state={dehydrate(queryClient, {
				shouldDehydrateQuery: (query) =>
					query.queryKey.length === 1 &&
					query.queryKey[0] === QUERY_KEY.category()[0] &&
					(query.state.status === "pending" ||
						query.state.status === "success"),
			})}
		>
			{children}
		</HydrationBoundary>
	);
}
