import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { MemoService, normalizeUrl } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

interface UseMemoQueryProps {
	url?: string;
	id?: number;
}

/** memoQueryOptions의 인자 */
interface IFMemoQueryOptionsParams extends UseMemoQueryProps {
	supabaseClient: MemoSupabaseClient;
}

/**
 * 메모 한 건 조회의 queryKey·queryFn을 만든다.
 *
 * @description useMemoQuery와 같은 키·조회 함수를 공유해, Suspense 밖에서 prefetch하거나
 * 비-Suspense(useQuery)로 읽어도 같은 캐시를 쓰게 한다.
 */
export const memoQueryOptions = ({
	supabaseClient,
	url,
	id,
}: IFMemoQueryOptionsParams) => {
	const memoService = new MemoService(supabaseClient);
	const normalizedUrl = url ? normalizeUrl(url) : undefined;

	return queryOptions({
		queryFn: async () => {
			if (id) {
				return memoService.getMemoById(id);
			}
			if (normalizedUrl) {
				return memoService.getMemoByUrl(normalizedUrl);
			}
			return { data: [], error: null };
		},
		queryKey: QUERY_KEY.memo({ url: normalizedUrl, id }),
	});
};

export default function useMemoQuery({ url, id }: UseMemoQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery(memoQueryOptions({ supabaseClient, url, id }));

	return {
		...query,
		memo: query.data?.data?.at(-1),
	};
}
