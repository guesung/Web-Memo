import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** GA 일별 지표 한 행. `metric`은 GA 이벤트 이름이거나 `active_users`다. */
export interface GaDailyMetricRow {
	/** YYYY-MM-DD */
	date: string;
	metric: string;
	/** 그 이벤트를 낸 사람 수 */
	users: number;
	/** 이벤트 발생 건수. `active_users`는 건수가 없어 null이다 */
	events: number | null;
}

interface UseAdminGaDailyMetricsQueryParams {
	/** 적재된 최신 날짜부터 거슬러 올라갈 일수 */
	days?: number;
}

/**
 * GA 일별 지표를 읽는다.
 *
 * @description 섹션 안에서 에러와 다시 시도를 직접 그리므로 Suspense 쿼리가 아니다.
 * RPC가 throw 하지 않고 `error`를 돌려주므로, 실패를 캐시하지 않게 여기서 던진다.
 *
 * RPC는 행 목록이 아니라 jsonb 배열 하나를 돌려준다. 행으로 돌려주면 PostgREST의 max_rows(1000)에
 * 잘려 90일치 중 앞쪽만 내려온다. 생성 타입이 `Json`이라 여기서 행 모양으로 좁힌다.
 */
export default function useAdminGaDailyMetricsQuery({
	days = 90,
}: UseAdminGaDailyMetricsQueryParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useQuery({
		queryKey: QUERY_KEY.adminGaDailyMetrics(days),
		queryFn: async () => {
			const { data, error } = await new AdminService(
				supabaseClient,
			).getGaDailyMetrics({ days });

			if (error) throw error;

			return (data ?? []) as unknown as GaDailyMetricRow[];
		},
		retry: 1,
	});
}
