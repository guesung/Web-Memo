import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { getPublicMemoSupabaseClient } from "../../../utils/extension";
import { NoticeService } from "../../../utils/supabase/noticeService";

/**
 * 확장 사이드 패널에 띄울 유효한 최신 공지 하나를 조회한다.
 * @description 세션 없이 도는 공개 클라이언트를 쓰므로 로그아웃 상태에서도 동작한다. 공지가 없으면 null이다.
 */
export default function useNoticeQuery() {
	return useQuery({
		queryKey: QUERY_KEY.notice(),
		queryFn: async () => {
			const noticeService = new NoticeService(getPublicMemoSupabaseClient());
			const { data, error } = await noticeService.getLatestActiveNotice();
			if (error) {
				throw error;
			}

			return data;
		},
	});
}
