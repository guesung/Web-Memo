import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 주간 코호트 한 칸. 코호트 주(`cohort_week`)에서 `week_offset`주 뒤의 활동 인원이다. */
export interface WeeklyRetentionRow {
	/** 코호트 주의 시작일(토요일, YYYY-MM-DD) */
	cohort_week: string;
	/** 그 주에 첫 활동을 한 사람 수 */
	cohort_size: number;
	week_offset: number;
	/** `week_offset`주 뒤에도 활동한 사람 수 */
	active_users: number;
}

interface UseAdminWeeklyRetentionQueryParams {
	/** 기준 주의 시작일(토요일, YYYY-MM-DD). `getLastCompleteWeekStart()`가 만든다. */
	weekStart: string;
	/** 기준 주를 포함해 몇 주 전 코호트까지 볼지 */
	weeks?: number;
}

/**
 * 주간 코호트 리텐션을 읽는다.
 *
 * @description 섹션 안에서 에러와 다시 시도를 직접 그리므로 Suspense 쿼리가 아니다.
 * RPC가 throw 하지 않고 `error`를 돌려주므로, 실패를 캐시하지 않게 여기서 던진다.
 */
export default function useAdminWeeklyRetentionQuery({
	weekStart,
	weeks = 8,
}: UseAdminWeeklyRetentionQueryParams) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useQuery({
		queryKey: QUERY_KEY.adminWeeklyRetention(weekStart, weeks),
		queryFn: async () => {
			const { data, error } = await new AdminService(
				supabaseClient,
			).getWeeklyRetention({ weekStart, weeks });

			if (error) throw error;

			return data as WeeklyRetentionRow[];
		},
		retry: 1,
	});
}
