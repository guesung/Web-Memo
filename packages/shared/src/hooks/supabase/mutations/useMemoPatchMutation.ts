import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { TCategoryChangeSource } from "../../../modules/analytics/type";
import type { MemoRow, MemoTable } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

type MutationVariables = {
	id: MemoRow["id"];
	request: MemoTable["Update"];
	/** 카테고리를 바꾼 경로. memo_category_change 이벤트의 source로 실립니다 */
	categorySource?: TCategoryChangeSource;
};
type MutationData = Awaited<ReturnType<MemoService["updateMemo"]>>;
type MutationError = Error;

export default function useMemoPatchMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MutationData, MutationError, MutationVariables>({
		meta: {
			feature: "memo",
			operation: "patch",
			stage: "save",
		},
		mutationFn: async (variables) => {
			const result = await new MemoService(supabaseClient).updateMemo(
				variables,
			);

			// supabase-js는 실패를 throw하지 않고 error로 돌려준다. 던지지 않으면 onError·토스트·호출부 롤백이 모두 건너뛰고 성공 이벤트까지 나간다.
			if (result.error) {
				throw result.error;
			}

			return result;
		},
		onSuccess: async (_, { request, categorySource }) => {
			await analytics.trackMemoUpdate(request, { categorySource });
			queryClient.invalidateQueries({
				queryKey: ["memo"],
			});
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.memos(),
			});
		},
	});
}
