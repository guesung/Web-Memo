import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import { analytics } from "../../modules/analytics";
import { HighlightMemoService } from "../../utils/supabase/highlightMemoService";
import { useSupabaseClientQuery, useSupabaseUserQuery } from "./queries";

/** 메모 변경 무효화와 함께 갱신되는 계정별 명시적 연결 조회. */
export function useHighlightMemoLinks(
	ids: number[],
	by: "highlight" | "memo" = "highlight",
) {
	const { data: client } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;
	const sortedIds = [...new Set(ids)].sort((a, b) => a - b);
	return useQuery({
		queryKey: ["memos", "highlightSources", userId, by, sortedIds],
		enabled: !!userId && sortedIds.length > 0,
		queryFn: () => {
			const service = new HighlightMemoService(client);
			return by === "memo"
				? service.getByMemoIds(sortedIds)
				: service.getByHighlightIds(sortedIds);
		},
	});
}

/** 실제 메모와 인용문을 하나의 트랜잭션으로 저장한다. */
export function useCreateHighlightMemo() {
	const { data: client } = useSupabaseClientQuery();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			highlightId,
			memo,
		}: {
			highlightId: number;
			memo: string;
		}) => new HighlightMemoService(client).create(highlightId, memo),
		onSuccess: async (result) => {
			// created가 false면 저장 재시도로 이미 만든 메모가 돌아온 것이라 새로 쓴 게 아니다.
			if (result.created) {
				void analytics.trackEvent({
					name: "memo_first_write",
					params: { source: "highlight" },
				});
				void analytics.trackEvent({
					name: "memo_write",
					params: { fields: "memo", is_new: true, source: "highlight" },
				});
			}
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() }),
				queryClient.invalidateQueries({ queryKey: QUERY_KEY.highlights() }),
				queryClient.invalidateQueries({ queryKey: ["memo"] }),
			]);
		},
	});
}
