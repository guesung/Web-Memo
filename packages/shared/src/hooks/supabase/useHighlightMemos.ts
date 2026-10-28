import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants/QueryKey";
import { analytics } from "../../modules/analytics";
import { HighlightMemoService } from "../../utils/supabase/highlightMemoService";
import { useSupabaseClientQuery, useSupabaseUserQuery } from "./queries";
import { useStableBatches } from "./stableBatches";

/** 메모 변경 무효화와 함께 갱신되는 계정별 명시적 연결 조회. */
export function useHighlightMemoLinks(
	ids: number[],
	by: "highlight" | "memo" = "highlight",
) {
	const { data: client } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;
	const sortedIds = [...new Set(ids)].sort((a, b) => a - b);
	const batches = useStableBatches(sortedIds, `${userId}:${by}`);
	const queries = useQueries({
		queries: batches.map((batch) => ({
			queryKey: ["memos", "highlightSources", userId, by, batch],
			enabled: !!userId,
			queryFn: () => {
				const service = new HighlightMemoService(client);
				return by === "memo"
					? service.getByMemoIds(batch)
					: service.getByHighlightIds(batch);
			},
		})),
	});
	const activeIds = new Set(sortedIds);
	const hasLoadError = queries.some((query) => query.isError);
	return {
		data: queries
			.flatMap((query) => query.data ?? [])
			.filter((link) =>
				by === "memo"
					? activeIds.has(link.memo_id)
					: link.highlight_id !== null && activeIds.has(link.highlight_id),
			),
		isError: hasLoadError,
		isPending: queries.length === 0 || queries.some((query) => query.isPending),
		refetch: async () =>
			Promise.all(
				queries
					.filter((query) => !hasLoadError || query.isError)
					.map((query) => query.refetch()),
			),
	};
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
