import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService, type IFGetFeedbacksParams } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/**
 * 관리자 피드백 목록 조회.
 * @description 피드백은 관리자 RPC로만 읽히므로 로그인 세션이 붙은 클라이언트를 쓴다.
 * 익명 피드백 클라이언트로는 `auth.uid()`가 비어 권한 검사에서 막힌다.
 */
export default function useFeedbacksQuery(params: IFGetFeedbacksParams = {}) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useQuery({
		queryFn: () => new AdminService(supabaseClient).getFeedbacks(params),
		queryKey: QUERY_KEY.feedbacks(params.searchQuery, params.page),
		enabled: !!supabaseClient,
	});

	return {
		...query,
		feedbacks: query.data?.data ?? [],
		totalCount: query.data?.count ?? 0,
	};
}
