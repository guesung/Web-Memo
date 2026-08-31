import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseResponse } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 휴지통의 메모를 되살린다 */
export default function useRestoreMemosMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		mutationFn: new MemoService(supabaseClient).restoreMemos,
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		},
	});
}
