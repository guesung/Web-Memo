import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { MemoSupabaseResponse } from "../../../types";
import { MemoService } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

/**
 * 휴지통의 메모를 완전히 지운다. 되돌릴 수 없다.
 * @description 낙관적 갱신을 하지 않는다. 되돌릴 수 없는 삭제라 화면에서 먼저
 * 사라졌다가 요청이 실패하면 사용자는 지워진 줄 알고 화면을 떠난다.
 */
export default function useDeleteMemosPermanentlyMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		mutationFn: new MemoService(supabaseClient).deleteMemosPermanently,
		onSuccess: (_, idList) => {
			analytics.trackEvent({
				name: "memo_delete_permanently",
				params: { memo_count: idList.length },
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		},
	});
}
