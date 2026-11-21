import {
	type InfiniteData,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { analytics } from "../../../modules/analytics";
import type { GetMemoResponse, MemoSupabaseResponse } from "../../../types";
import { MemoService } from "../../../utils";

import { useSupabaseClientQuery } from "../queries";

interface MemosPageData {
	data: GetMemoResponse[];
	count: number;
}

export default function useDeleteMemosMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<MemoSupabaseResponse, Error, number[]>({
		meta: {
			feature: "memo",
			operation: "delete",
			stage: "save",
		},
		mutationFn: new MemoService(supabaseClient).deleteMemos,
		onMutate: async (idList) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });

			queryClient.setQueriesData<InfiniteData<MemosPageData>>(
				{ queryKey: QUERY_KEY.memosPaginatedPrefix() },
				(oldData) => {
					if (!oldData) return oldData;

					const deletedCount = idList.length;

					return {
						...oldData,
						pages: oldData.pages.map((page, index) => ({
							...page,
							data: page.data.filter((memo) => !idList.includes(memo.id)),
							count:
								index === 0
									? Math.max(0, page.count - deletedCount)
									: page.count,
						})),
					};
				},
			);
		},
		onSuccess: (_, idList) => {
			analytics.trackEvent({
				name: "memo_delete",
				params: { memo_count: idList.length },
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		},
	});
}
