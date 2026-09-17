import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoSupabaseResponse } from "../../../types";
import { MemoService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

/** 휴지통의 메모를 되살린다 */
export default function useRestoreMemosMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		mutationFn: new MemoService(supabaseClient).restoreMemos,
		onSuccess: (_, idList) => {
			analytics.trackEvent({
				name: "memo_restore",
				params: { memo_count: idList.length },
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		},
	});
}
