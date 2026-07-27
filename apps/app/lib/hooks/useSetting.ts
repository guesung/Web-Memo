import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { SettingTable } from "@web-memo/shared/types";
import { settingService } from "@/lib/supabase/client";

export function useSettingQuery(isLoggedIn: boolean) {
	const query = useQuery({
		queryKey: QUERY_KEY.setting(),
		queryFn: async () => {
			const result = await settingService.getSetting();
			return result.data;
		},
		enabled: isLoggedIn,
	});

	return {
		...query,
		showImpression: query.data?.show_impression ?? false,
		showActionItem: query.data?.show_action_item ?? false,
	};
}

export function useSettingUpsertMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (request: Omit<SettingTable["Insert"], "user_id">) =>
			settingService.upsertSetting(request),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.setting() });
		},
	});
}
