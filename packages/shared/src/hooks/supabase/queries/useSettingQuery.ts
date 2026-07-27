import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { SettingService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

export default function useSettingQuery() {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: new SettingService(supabaseClient).getSetting,
		queryKey: QUERY_KEY.setting(),
		staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
	});

	return {
		...query,
		showImpression: query.data?.data?.show_impression ?? false,
		showActionItem: query.data?.data?.show_action_item ?? false,
	};
}
