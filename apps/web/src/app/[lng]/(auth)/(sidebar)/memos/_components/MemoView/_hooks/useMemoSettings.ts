import { useQuery } from "@tanstack/react-query";
import {
	settingQueryOptions,
	useSupabaseClientQuery,
} from "@web-memo/shared/hooks";

/** 메모 목록에서 선택적 설정 조회가 목록 렌더링을 중단하지 않게 한다. */
export function useMemoSettings() {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const query = useQuery(settingQueryOptions(supabaseClient));

	return {
		showImpression: query.data?.data?.show_impression ?? false,
		showActionItem: query.data?.data?.show_action_item ?? false,
		truncateMemoContent: query.data?.data?.truncate_memo_content ?? true,
		isSettingReady: query.isSuccess,
		isSettingError: query.isError,
		refetchSetting: query.refetch,
	};
}
