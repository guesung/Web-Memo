import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { SettingService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 메모 입력 설정 조회의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const settingQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions({
		queryFn: new SettingService(supabaseClient).getSetting,
		queryKey: QUERY_KEY.setting(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

/** 로그인한 사용자의 메모 입력 설정을 조회한다. */
const useSettingQuery = () => {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery(settingQueryOptions(supabaseClient));

	return {
		...query,
		truncateMemoContent: query.data?.data?.truncate_memo_content ?? true,
		showImpression: query.data?.data?.show_impression ?? false,
		showActionItem: query.data?.data?.show_action_item ?? false,
	};
};

export default useSettingQuery;
