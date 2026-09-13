import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseResponse, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

/** 메모 생성 실패입니다. */
type TMutationError = Error;

/** DB 제한 오류를 생성 성공으로 취급하지 않는 메모 생성 훅입니다. */
const useMemoPostMutation = () => {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, TMutationError, MemoTable["Insert"]>(
		{
			mutationFn: async (request) => {
				const result = await new MemoService(supabaseClient).insertMemo(
					request,
				);
				if (result.error) {
					throw result.error;
				}

				return result;
			},
			onSuccess: async (result) => {
				const { data: newData } = result;

				await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });

				const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(
					QUERY_KEY.memos(),
				);

				if (!previousMemos || !newData) {
					await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
					return;
				}

				const { data: previousMemosData } = previousMemos;

				if (!previousMemosData) {
					await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
					return;
				}

				const newMemosData = newData.concat(previousMemosData);

				await queryClient.setQueryData(QUERY_KEY.memos(), {
					...previousMemos,
					data: newMemosData,
				});

				return { previousMemos };
			},
		},
	);
};

export default useMemoPostMutation;
