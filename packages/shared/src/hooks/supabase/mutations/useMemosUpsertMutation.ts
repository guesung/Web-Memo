import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { GetMemoResponse } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 일괄 메모 저장의 MutationVariables 계약이다. */
type TMutationVariables = GetMemoResponse[];
/** 일괄 메모 저장의 MutationData 계약이다. */
type TMutationData = Awaited<ReturnType<MemoService["upsertMemos"]>>;
/** 일괄 메모 저장의 MutationError 계약이다. */
type TMutationError = Error;

/** 메모를 일괄 저장한 뒤 카테고리와 메모 목록 캐시를 갱신한다. */
const useMemosUpsertMutation = () => {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<TMutationData, TMutationError, TMutationVariables>({
		meta: {
			feature: "memo",
			operation: "bulk-upsert",
			stage: "save",
		},
		mutationFn: new MemoService(supabaseClient).upsertMemos,
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() }),
				queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() }),
			]);
		},
	});
};

export default useMemosUpsertMutation;
