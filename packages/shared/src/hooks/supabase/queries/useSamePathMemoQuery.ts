import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { getPathKey, MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 같은 경로의 메모 후보를 조회하는 입력. */
interface IFUseSamePathMemoQueryProps {
	/** 현재 탭 URL. 비어 있거나 파싱할 수 없으면 조회하지 않는다 */
	url: string;
}

/** samePathMemoQueryOptions의 인자 */
interface IFSamePathMemoQueryOptionsParams extends IFUseSamePathMemoQueryProps {
	supabaseClient: MemoSupabaseClient;
}

/**
 * 같은 경로 메모 후보 조회의 queryKey·queryFn을 만든다.
 *
 * @description useSamePathMemoQuery와 같은 키·조회 함수를 공유해, Suspense 밖에서 prefetch하거나
 * 비-Suspense(useQuery)로 읽어도 같은 캐시를 쓰게 한다.
 */
export const samePathMemoQueryOptions = ({
	supabaseClient,
	url,
}: IFSamePathMemoQueryOptionsParams) => {
	const memoService = new MemoService(supabaseClient);
	const pathKey = getSafePathKey(url);

	return queryOptions({
		queryFn: async () => {
			if (!pathKey) {
				return { data: [], error: null };
			}

			const result = await memoService.getMemosBySamePath(url);

			if (result.error) {
				throw result.error;
			}

			return result;
		},
		queryKey: QUERY_KEY.samePathMemos(pathKey ?? ""),
	});
};

/**
 * 쿼리만 다른 주소까지 포함해 같은 경로의 메모 후보를 조회한다.
 * @description 사이드 패널이 현재 URL에 메모가 없을 때 다른 주소의 메모를 고를 수 있게 하는 용도다.
 */
export default function useSamePathMemoQuery({
	url,
}: IFUseSamePathMemoQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery(
		samePathMemoQueryOptions({ supabaseClient, url }),
	);

	return {
		...query,
		memos: query.data?.data ?? [],
	};
}

const getSafePathKey = (url: string) => {
	if (!url) {
		return null;
	}

	try {
		return getPathKey(url);
	} catch {
		return null;
	}
};
