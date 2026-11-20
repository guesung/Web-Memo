import {
	queryOptions,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { SettingService } from "../../../utils";

import useMemoStoreQuery from "./useMemoStoreQuery";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/** 비로그인(기기 저장소)에는 서버에 저장된 행이 없다. */
const GUEST_RESPONSE = { data: null, error: null } as const;

/** 메모 입력 설정 조회의 queryKey·queryFn을 만든다. prefetch와 훅이 같은 캐시를 쓰게 한다. */
export const settingQueryOptions = (supabaseClient: MemoSupabaseClient) =>
	queryOptions({
		queryFn: new SettingService(supabaseClient).getSetting,
		queryKey: QUERY_KEY.setting(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

/**
 * 메모 입력 설정을 조회한다.
 * @description 로그인한 사용자는 서버 설정을 읽는다. 확장에서 세션이 없어 기기 저장소를 쓰는 동안에는
 * 서버를 부르지 않고 저장된 설정이 없는 것으로 보아 기본값을 돌려준다.
 * 로그인하면 캐시가 섞이지 않도록 키를 따로 둔다.
 */
const useSettingQuery = () => {
	const queryClient = useQueryClient();
	const { data: memoStore } = useMemoStoreQuery();
	const isGuest = memoStore.kind === "local";

	const query = useSuspenseQuery({
		queryKey: isGuest ? [...QUERY_KEY.setting(), "guest"] : QUERY_KEY.setting(),
		queryFn: async () => {
			if (isGuest) {
				return GUEST_RESPONSE;
			}

			const supabaseClient = await queryClient.ensureQueryData(
				supabaseClientQueryOptions(),
			);

			return new SettingService(supabaseClient).getSetting();
		},
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
		// 기기 저장소 상태의 빈 결과는 네트워크가 필요 없다. 기본값이면 오프라인에서 Suspense가 풀리지 않는다.
		networkMode: isGuest ? "always" : "online",
	});

	return {
		...query,
		truncateMemoContent: query.data?.data?.truncate_memo_content ?? true,
		showImpression: query.data?.data?.show_impression ?? false,
		showActionItem: query.data?.data?.show_action_item ?? false,
		showSummary: query.data?.data?.show_summary ?? true,
		showAiChat: query.data?.data?.show_ai_chat ?? false,
		weeklyReportEnabled: query.data?.data?.weekly_report_enabled ?? true,
		weeklyReportEmail: query.data?.data?.weekly_report_email ?? null,
	};
};

export default useSettingQuery;
