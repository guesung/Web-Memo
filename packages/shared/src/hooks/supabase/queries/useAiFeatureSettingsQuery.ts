import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { memoStoreQueryOptions } from "./useMemoStoreQuery";
import { settingQueryOptions } from "./useSettingQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/**
 * 페이지 요약·AI 채팅 표시 여부를 Suspense 없이 조회한다.
 * @description 설정 조회가 끝나고 행이 없으면 요약을 켠다.
 * 로딩 중·조회 실패일 때는 요약을 숨겨 저장된 OFF 설정이 잠깐 노출되지 않게 한다.
 * 기기 저장소를 쓰는 비로그인 상태는 저장된 설정이 없으므로 기본값(요약 켜짐·채팅 꺼짐)을 쓴다.
 * 요약 행에서 로그인 안내를 보여 주기 위해서다.
 * `useSettingQuery`와 같은 queryKey라서 설정 저장 뒤 invalidate가 그대로 반영된다.
 */
const useAiFeatureSettingsQuery = () => {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useQuery(supabaseClientQueryOptions());
	const { data: memoStoreKind } = useQuery({
		...memoStoreQueryOptions(queryClient),
		select: (memoStore) => memoStore.kind,
	});
	const { data: setting, isSuccess: isSettingLoaded } = useQuery({
		queryKey: QUERY_KEY.setting(),
		queryFn: supabaseClient
			? settingQueryOptions(supabaseClient).queryFn
			: skipToken,
		staleTime: 1000 * 60 * 5,
	});

	if (memoStoreKind === "local") {
		return { showSummary: true, showAiChat: false };
	}

	return {
		showSummary: isSettingLoaded
			? (setting?.data?.show_summary ?? true)
			: false,
		showAiChat: setting?.data?.show_ai_chat ?? false,
	};
};

export default useAiFeatureSettingsQuery;
