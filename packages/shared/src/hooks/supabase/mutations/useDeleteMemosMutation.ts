import { NoMemosError, QUERY_KEY } from "@src/constants";
import type { MemoSupabaseResponse } from "@src/types";
import { MemoService } from "@src/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseClientQuery } from "../queries";

export default function useDeleteMemosMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		mutationFn: new MemoService(supabaseClient).deleteMemos,
		onMutate: async (idList) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
			const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
				QUERY_KEY.memos(),
			);

			if (!previousMemos) throw new NoMemosError();

			const { data: previousMemosData } = previousMemos;

			if (!previousMemosData) throw new NoMemosError();

			const newMemosData = previousMemosData.filter(
				(memo) => !idList.includes(memo.id),
			);

			await queryClient.setQueryData(QUERY_KEY.memos(), {
				...previousMemos,
				data: newMemosData,
			});

			return { previousMemos };
		},
	});
}
