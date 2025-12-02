import {
	type InfiniteData,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
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
		mutationFn: new MemoService(supabaseClient).deleteMemos,
		onMutate: async (idList) => {
			await queryClient.cancelQueries({ queryKey: ["memos"] });

			queryClient.setQueriesData<InfiniteData<MemosPageData>>(
				{ queryKey: ["memos", "paginated"] },
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
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["memos"] });
		},
	});
}
