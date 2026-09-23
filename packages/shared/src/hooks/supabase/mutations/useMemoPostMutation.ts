import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseResponse, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 메모 생성 요청의 오류 타입이다. */
type TMutationError = Error;

/** 메모를 생성하고 모든 메모 목록 캐시를 갱신한다. */
const useMemoPostMutation = () => {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, TMutationError, MemoTable["Insert"]>(
		{
			meta: {
				feature: "memo",
				operation: "create",
				stage: "save",
			},
			mutationFn: new MemoService(supabaseClient).insertMemo,
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
			},
		},
	);
};

export default useMemoPostMutation;
