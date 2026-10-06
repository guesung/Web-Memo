import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemoDelete } from "@/lib/hooks/useLocalMemos";
import { useDeleteMemoMutation } from "@/lib/hooks/useMemoMutation";
import { restoreMemo } from "@/lib/storage/localMemo";
import { memoService } from "@/lib/supabase/client";
import type { MemoItem } from "../_components/MemoCard";

/** 삭제 직후 ID로 같은 메모를 복구한다. */
export function useDeleteWithUndo() {
	const { isLoggedIn } = useAuth();
	const queryClient = useQueryClient();
	const deleteLocal = useLocalMemoDelete();
	const deleteSupabase = useDeleteMemoMutation();
	const [deletedMemo, setDeletedMemo] = useState<MemoItem | null>(null);
	const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleDelete = useCallback(
		(item: MemoItem) => {
			if (deleteTimerRef.current) {
				clearTimeout(deleteTimerRef.current);
			}
			setDeletedMemo(item);
			if (isLoggedIn) {
				deleteSupabase.mutate(item.id as number);
			} else {
				deleteLocal.mutate(item.id as string);
			}
			deleteTimerRef.current = setTimeout(() => setDeletedMemo(null), 3000);
		},
		[isLoggedIn, deleteSupabase, deleteLocal],
	);

	const handleUndo = useCallback(async () => {
		if (!deletedMemo) {
			return;
		}
		if (deleteTimerRef.current) {
			clearTimeout(deleteTimerRef.current);
		}
		if (isLoggedIn) {
			const result = await memoService.restoreMemos([deletedMemo.id as number]);
			if (result.error) {
				throw result.error;
			}
		} else {
			await restoreMemo(deletedMemo.id as string);
		}
		queryClient.invalidateQueries({ queryKey: ["memos"] });
		queryClient.invalidateQueries({ queryKey: ["memo"] });
		queryClient.invalidateQueries({ queryKey: ["localMemos"] });
		queryClient.invalidateQueries({ queryKey: ["localMemo"] });
		setDeletedMemo(null);
	}, [deletedMemo, isLoggedIn, queryClient]);

	return { deletedMemo, handleDelete, handleUndo };
}
