import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoSupabaseResponse } from "../../../types";
import { useMemoStoreQuery } from "../queries";

/** 휴지통의 메모를 되살린다 */
export default function useRestoreMemosMutation() {
	const queryClient = useQueryClient();
	const { data: memoStore } = useMemoStoreQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		meta: {
			feature: "memo",
			operation: "restore",
			stage: "save",
		},
		mutationFn: async (idList) => memoStore.restoreMemos(idList),
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
