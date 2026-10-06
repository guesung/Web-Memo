import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { settingQueryOptions } from "./useSettingQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/**
 * 페이지 요약·AI 채팅 표시 여부를 Suspense 없이 조회한다.
 * @description 기본값이 꺼짐이라 로딩 중·조회 실패·로그아웃일 때도 모두 꺼짐으로 돌려준다.
 * 호출부는 `isLoading`을 보지 않고 꺼짐 화면에서 시작해, 켜진 값이 오면 탭을 보여주면 된다.
 * `useSettingQuery`와 같은 queryKey라서 설정 저장 뒤 invalidate가 그대로 반영된다.
 */
const useAiFeatureSettingsQuery = () => {
	const { data: supabaseClient } = useQuery(supabaseClientQueryOptions());
	const { data: setting } = useQuery({
		queryKey: QUERY_KEY.setting(),
		queryFn: supabaseClient
			? settingQueryOptions(supabaseClient).queryFn
			: skipToken,
		staleTime: 1000 * 60 * 5,
	});

	return {
		showSummary: setting?.data?.show_summary ?? false,
		showAiChat: setting?.data?.show_ai_chat ?? false,
	};
};

export default useAiFeatureSettingsQuery;
