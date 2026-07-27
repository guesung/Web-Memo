import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { SettingService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

export default function useSettingUpsertMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation({
		mutationFn: new SettingService(supabaseClient).upsertSetting,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.setting() });
		},
	});
}
