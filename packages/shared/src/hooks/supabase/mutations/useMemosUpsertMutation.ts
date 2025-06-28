import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NoMemosError, QUERY_KEY } from "../../../constants";
import type {
	GetMemoResponse,
	MemoRow,
	MemoSupabaseResponse,
} from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = GetMemoResponse[];
type MutationData = Awaited<ReturnType<MemoService["upsertMemos"]>>;
type MutationError = Error;

export default function useMemosUpsertMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: new MemoService(supabaseClient).upsertMemos,
		onMutate: async (memoRequest) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
			const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
				QUERY_KEY.memos(),
			);

			if (!previousMemos) throw new NoMemosError();

			const { data: previousMemosData } = previousMemos;

			if (!previousMemosData) throw new NoMemosError();

			const updatedMemosData = [...previousMemosData];

			memoRequest.forEach((memo) => {
				const currentMemoIndex = updatedMemosData.findIndex(
					(previousMemo) => previousMemo.id === memo.id,
				);
				const currentMemoBase = updatedMemosData.find(
					(previousMemo) => previousMemo.id === memo.id,
				);

				if (currentMemoIndex === -1 || !currentMemoBase)
					updatedMemosData.unshift(memo as MemoRow);
				else
					updatedMemosData.splice(currentMemoIndex, 1, {
						...currentMemoBase,
						...memo,
					});
			});

			await queryClient.setQueryData(QUERY_KEY.memos(), {
				...previousMemos,
				data: updatedMemosData,
			});

			return { previousMemos };
		},
	});
}
