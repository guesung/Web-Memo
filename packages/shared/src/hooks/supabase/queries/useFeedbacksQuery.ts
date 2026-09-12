import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { FeedbackService, type IFGetFeedbacksParams } from "../../../utils";
import useSupabaseFeedbackClientQuery from "./useSupabaseFeedbackClientQuery";

/**
 * 관리자 피드백 목록 조회.
 * @description 피드백 클라이언트는 브라우저에서만 만들어지므로 클라이언트가 준비된 뒤에만 조회한다.
 */
export default function useFeedbacksQuery(params: IFGetFeedbacksParams = {}) {
	const { data: supabaseClient } = useSupabaseFeedbackClientQuery();

	const query = useQuery({
		queryFn: () => new FeedbackService(supabaseClient).getFeedbacks(params),
		queryKey: QUERY_KEY.feedbacks(params.searchQuery, params.page),
		enabled: !!supabaseClient,
	});

	return {
		...query,
		feedbacks: query.data?.data ?? [],
		totalCount: query.data?.count ?? 0,
	};
}
