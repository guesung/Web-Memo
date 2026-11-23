import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { getQueryClient } from "@src/utils";
import { dehydrate, HydrationBoundary, hashKey } from "@tanstack/react-query";
import { E2E_MOCK_SUPABASE_COOKIE } from "@web-memo/shared/constants";
import { memosInfiniteQueryOptions } from "@web-memo/shared/utils";
import { cookies } from "next/headers";
import type { PropsWithChildren } from "react";
import type { TMemoFilter, TMemoSearchParams } from "../../_types";
import { getMemoListQueryParams, getMemoListView } from "../../_utils";

interface MemoListHydrationBoundaryProps extends PropsWithChildren {
	filter: TMemoFilter;
	searchParams: TMemoSearchParams;
}

/**
 * 메모 첫 페이지 조회를 서버에서 시작하고, pending 상태 그대로 브라우저 캐시에 넘긴다.
 *
 * @description 목록은 `ssr:false`라 예전에는 HTML 도착 → 하이드레이션 → 목록 청크 → 사용자 확인을
 * 모두 거친 뒤에야 조회가 나갔다(운영 실측 400~560ms 공백). 서버에서 기다리지 않고 시작해 두면
 * 브라우저의 같은 키 쿼리가 그 promise를 이어받는다. 렌더는 그대로 클라이언트에서 한다.
 * 검색어는 폼 상태라 첫 진입에는 항상 비어 있다.
 */
export default async function MemoListHydrationBoundary({
	filter,
	searchParams,
	children,
}: MemoListHydrationBoundaryProps) {
	// 읽을 계획은 페이지 단위가 아니라 한 번에 전부 읽는 다른 쿼리를 쓴다.
	// E2E 목은 브라우저 요청만 가로채므로, 목을 건 테스트에서는 서버 조회를 넘기지 않는다.
	if (filter === "plan" || (await cookies()).has(E2E_MOCK_SUPABASE_COOKIE)) {
		return children;
	}

	const [query, supabaseClient] = await Promise.all([
		searchParams,
		getSupabaseClient(),
	]);
	const queryOptions = memosInfiniteQueryOptions(
		supabaseClient,
		getMemoListQueryParams({
			filter,
			category: getFirstParam(query.category) ?? "",
			view: getMemoListView(getFirstParam(query.view)),
			domainParam: getFirstParam(query.domain),
			searchQuery: "",
		}),
	);
	const queryHash = hashKey(queryOptions.queryKey);
	const queryClient = getQueryClient();
	void queryClient.prefetchInfiniteQuery(queryOptions);

	return (
		<HydrationBoundary
			state={dehydrate(queryClient, {
				shouldDehydrateQuery: (cachedQuery) =>
					cachedQuery.queryHash === queryHash &&
					(cachedQuery.state.status === "pending" ||
						cachedQuery.state.status === "success"),
			})}
		>
			{children}
		</HydrationBoundary>
	);
}

/** 브라우저의 `searchParams.get()`처럼 같은 이름이 여러 번 오면 첫 값을 쓴다. */
const getFirstParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;
