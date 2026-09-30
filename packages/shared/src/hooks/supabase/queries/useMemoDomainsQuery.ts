import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 도메인 목록을 다시 읽기 전까지 유지하는 시간. */
const STALE_TIME = 5 * 60 * 1000;

/**
 * 내 메모 url에서 뽑은 도메인 목록을 이름순으로 조회한다.
 * @description 메모 목록을 막지 않도록 Suspense를 쓰지 않는다. 실패하면 `isError`로 알린다.
 */
const useMemoDomainsQuery = () => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	return useQuery({
		queryKey: QUERY_KEY.memoDomains(),
		queryFn: async () => {
			const { data, error } = await memoService.getMemoDomains();

			if (error) {
				throw error;
			}

			return data ?? [];
		},
		staleTime: STALE_TIME,
		retry: 1,
	});
};

export default useMemoDomainsQuery;
