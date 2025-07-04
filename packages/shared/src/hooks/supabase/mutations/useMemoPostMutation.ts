import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NoMemosError, QUERY_KEY } from "../../../constants";
import type { MemoSupabaseResponse, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationError = Error;

export default function useMemoPostMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, MutationError, MemoTable["Insert"]>({
		mutationFn: new MemoService(supabaseClient).insertMemo,
		onSuccess: async (result) => {
			const { data: newData } = result;

			await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });

			const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
				QUERY_KEY.memos(),
			);

			if (!previousMemos || !newData) throw new NoMemosError();

			const { data: previousMemosData } = previousMemos;

			if (!previousMemosData) throw new NoMemosError();

			const newMemosData = newData.concat(previousMemosData);

			await queryClient.setQueryData(QUERY_KEY.memos(), {
				...previousMemos,
				data: newMemosData,
			});

			return { previousMemos };
		},
	});
}
