import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoRow, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	id: MemoRow["id"];
	request: MemoTable["Update"];
};
type MutationData = Awaited<ReturnType<MemoService["updateMemo"]>>;
type MutationError = Error;

export default function useMemoPatchMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		mutationFn: new MemoService(supabaseClient).updateMemo,
		onSuccess: async () => {
			await analytics.trackMemoWrite();
			queryClient.invalidateQueries({
				queryKey: ["memo"],
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memos(),
			});
		},
	});
}
