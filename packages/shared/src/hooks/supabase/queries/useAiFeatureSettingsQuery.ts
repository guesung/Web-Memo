import { skipToken, useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { settingQueryOptions } from "./useSettingQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/**
 * 페이지 요약·AI 채팅 표시 여부를 Suspense 없이 조회한다.
 * @description 설정 조회가 끝나고 행이 없으면 요약을 켠다.
 * 로딩 중·조회 실패·로그아웃일 때는 요약을 숨겨 저장된 OFF 설정이 잠깐 노출되지 않게 한다.
 * `useSettingQuery`와 같은 queryKey라서 설정 저장 뒤 invalidate가 그대로 반영된다.
 */
const useAiFeatureSettingsQuery = () => {
	const { data: supabaseClient } = useQuery(supabaseClientQueryOptions());
	const { data: setting, isSuccess: isSettingLoaded } = useQuery({
		queryKey: QUERY_KEY.setting(),
		queryFn: supabaseClient
			? settingQueryOptions(supabaseClient).queryFn
			: skipToken,
		staleTime: 1000 * 60 * 5,
	});

	return {
		showSummary: isSettingLoaded
			? (setting?.data?.show_summary ?? true)
			: false,
		showAiChat: setting?.data?.show_ai_chat ?? false,
	};
};

export default useAiFeatureSettingsQuery;
