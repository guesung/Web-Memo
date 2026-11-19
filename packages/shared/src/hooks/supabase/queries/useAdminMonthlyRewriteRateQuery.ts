import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 첫 메모를 쓴 달 하나의 재작성 현황. */
export interface MonthlyRewriteRateRow {
	/** 첫 메모를 쓴 달(월의 첫날) */
	cohort_month: string;
	/** 그 달에 첫 메모를 쓴 사람 수 */
	new_writers: number;
	/** 첫 메모 +7~30일에 메모를 더 만든 사람 수 */
	rewriters: number;
	/** 30일이 아직 지나지 않은 사람이 있어 수치가 더 오를 수 있는 달 */
	incomplete: boolean;
}

/**
 * 월별 메모 재작성률을 읽는다.
 *
 * @description 섹션 안에서 에러와 다시 시도를 직접 그리므로 Suspense 쿼리가 아니다.
 * RPC가 throw 하지 않고 `error`를 돌려주므로, 실패를 캐시하지 않게 여기서 던진다.
 */
export default function useAdminMonthlyRewriteRateQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useQuery({
		queryKey: QUERY_KEY.adminMonthlyRewriteRate(),
		queryFn: async () => {
			const { data, error } = await new AdminService(
				supabaseClient,
			).getMonthlyRewriteRate();

			if (error) throw error;

			return data as MonthlyRewriteRateRow[];
		},
		retry: 1,
	});
}
