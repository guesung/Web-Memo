import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import { SettingService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

export default function useSettingUpsertMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new SettingService(supabaseClient).upsertSetting,
		onSuccess: (_, request) => {
			// 어느 설정을 건드렸는지만 남깁니다. 값 자체는 지표로 쓸 일이 없습니다.
			analytics.trackEvent({
				name: "setting_change",
				params: { setting_keys: Object.keys(request).sort().join(",") },
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.setting() });
		},
	});
}
