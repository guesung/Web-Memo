import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
	deleteMemoPermanently,
	getDeletedMemos,
	type LocalMemo,
	restoreMemo,
} from "@/lib/storage/localMemo";
import { memoService } from "@/lib/supabase/client";

/** 휴지통 화면이 다루는 메모. 로그인 여부에 따라 원본 타입이 다르다 */
export type TTrashMemo = GetMemoResponse | LocalMemo;

/** 휴지통 항목의 id. Supabase는 number, 로컬은 string */
export type TTrashMemoId = number | string;

/** 휴지통에 있는 메모를 최근에 버린 순으로 가져온다 */
export function useDeletedMemos() {
	const { isLoggedIn } = useAuth();

	return useQuery({
		queryKey: [...QUERY_KEY.deletedMemos(), isLoggedIn],
		queryFn: async (): Promise<TTrashMemo[]> => {
			if (!isLoggedIn) {
				return getDeletedMemos();
			}

			const { data } = await memoService.getDeletedMemos();
			return (data ?? []) as GetMemoResponse[];
		},
	});
}

/** 휴지통의 메모를 되살린다 */
export function useRestoreMemo() {
	const queryClient = useQueryClient();
	const { isLoggedIn } = useAuth();

	return useMutation({
		mutationFn: async (id: TTrashMemoId) => {
			if (!isLoggedIn) {
				return restoreMemo(id as string);
			}

			return memoService.restoreMemos([id as number]);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
			queryClient.invalidateQueries({ queryKey: ["localMemos"] });
		},
	});
}

/**
 * 메모를 완전히 지운다. 되돌릴 수 없다.
 * @description 낙관적 갱신을 하지 않는다. 화면에서 먼저 사라졌다가 요청이
 * 실패하면 사용자는 지워진 줄 알고 화면을 떠난다.
 */
export function useDeleteMemoPermanently() {
	const queryClient = useQueryClient();
	const { isLoggedIn } = useAuth();

	return useMutation({
		mutationFn: async (id: TTrashMemoId) => {
			if (!isLoggedIn) {
				return deleteMemoPermanently(id as string);
			}

			return memoService.deleteMemosPermanently([id as number]);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
			queryClient.invalidateQueries({ queryKey: ["localMemos"] });
		},
	});
}
