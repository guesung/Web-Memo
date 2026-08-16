import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	DEFAULT_HIGHLIGHT_COLOR,
	type HighlightColor,
	QUERY_KEY,
} from "@web-memo/shared/constants";
import type { HighlightAnchor } from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { normalizeUrl } from "@web-memo/shared/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { highlightService } from "@/lib/supabase/client";

/** 하이라이트 생성 뮤테이션 입력. */
export interface CreateHighlightInput {
	anchor: HighlightAnchor;
	url: string;
	title: string;
	favIconUrl: string;
}

/**
 * 하이라이트를 저장한다.
 * @description 낙관적 업데이트를 하지 않는다. 밑줄은 보이는데 서버에 없는 상태가
 * 사용자에게 가장 나쁘므로, 저장이 성공한 뒤에 그린다(설계 §6-2).
 */
export function useHighlightCreateMutation() {
	const queryClient = useQueryClient();
	const { session } = useAuth();

	return useMutation<HighlightRow, Error, CreateHighlightInput>({
		mutationFn: async (input) => {
			const userId = session?.user.id;

			if (!userId) {
				throw new Error("로그인이 필요합니다.");
			}

			const url = normalizeUrl(input.url);
			const { data, error } = await highlightService.insertHighlight({
				user_id: userId,
				url,
				title: input.title,
				favIconUrl: input.favIconUrl,
				exact_text: input.anchor.exact,
				prefix_text: input.anchor.prefix,
				suffix_text: input.anchor.suffix,
				text_position_start: input.anchor.textPositionStart,
				color: DEFAULT_HIGHLIGHT_COLOR,
			});

			if (error || !data?.[0]) {
				throw new Error(error?.message ?? "하이라이트를 저장하지 못했습니다.");
			}

			return data[0];
		},
		onSuccess: (highlight) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(highlight.url),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.highlightCountsPrefix() });
		},
	});
}

/**
 * 하이라이트의 색상 또는 메모를 수정한다.
 * @description `note`를 빈 문자열로 지우는 경우도 유효한 갱신이므로
 * `undefined` 여부로만 부분 갱신 대상을 판단한다.
 */
export function useHighlightUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation<
		HighlightRow,
		Error,
		{ id: number; url: string; color?: HighlightColor; note?: string }
	>({
		mutationFn: async ({ id, color, note }) => {
			const { data, error } = await highlightService.updateHighlight({
				id,
				request: {
					...(color ? { color } : {}),
					...(note !== undefined ? { note } : {}),
				},
			});

			if (error || !data?.[0]) {
				throw new Error(error?.message ?? "하이라이트를 수정하지 못했습니다.");
			}

			return data[0];
		},
		onSuccess: (_result, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(variables.url),
			});
		},
	});
}

/** 하이라이트를 삭제한다. */
export function useHighlightDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, { id: number; url: string }>({
		mutationFn: async ({ id }) => {
			const { error } = await highlightService.deleteHighlight(id);

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: (_result, variables) => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.highlightsByUrl(variables.url),
			});
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.highlightCountsPrefix() });
		},
	});
}
