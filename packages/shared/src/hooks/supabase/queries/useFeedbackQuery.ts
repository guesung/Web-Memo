import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { AdminService } from "../../../utils";
import useSupabaseClientQuery from "./useSupabaseClientQuery";

/**
 * 피드백 한 건 조회.
 * @description `?id=`로 들어온 행이 현재 목록 페이지에 없을 때 그 행만 따로 가져온다.
 */
export default function useFeedbackQuery(id: number | null) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useQuery({
		queryFn: () => new AdminService(supabaseClient).getFeedback(Number(id)),
		queryKey: QUERY_KEY.feedback(Number(id)),
		enabled: !!supabaseClient && id !== null,
	});

	return { ...query, feedback: query.data ?? null };
}
