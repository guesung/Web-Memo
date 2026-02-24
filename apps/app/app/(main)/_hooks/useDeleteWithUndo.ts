import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useLocalMemoDelete,
	useLocalMemoUpsert,
} from "@/lib/hooks/useLocalMemos";
import {
	useDeleteMemoMutation,
	useMemoUpsertMutation,
} from "@/lib/hooks/useMemoMutation";
import { useCallback, useRef, useState } from "react";
import type { MemoItem } from "../_components/MemoCard";

export function useDeleteWithUndo() {
	const { isLoggedIn } = useAuth();
	const deleteLocal = useLocalMemoDelete();
	const deleteSupabase = useDeleteMemoMutation();
	const upsertLocal = useLocalMemoUpsert();
	const upsertSupabase = useMemoUpsertMutation();

	const [deletedMemo, setDeletedMemo] = useState<MemoItem | null>(null);
	const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleDelete = useCallback(
		(item: MemoItem) => {
			if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
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

	const handleUndo = useCallback(() => {
		if (!deletedMemo) return;
		if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
		if (isLoggedIn) {
			const m = deletedMemo as import("@web-memo/shared/types").GetMemoResponse;
			upsertSupabase.mutate({
				url: m.url,
				title: m.title,
				memo: m.memo ?? "",
				favIconUrl: m.favIconUrl ?? undefined,
				isWish: m.isWish ?? false,
			});
		} else {
			const m = deletedMemo as import("@/lib/storage/localMemo").LocalMemo;
			upsertLocal.mutate({
				url: m.url,
				title: m.title,
				memo: m.memo,
				favIconUrl: m.favIconUrl,
				isWish: m.isWish,
			});
		}
		setDeletedMemo(null);
	}, [deletedMemo, isLoggedIn, upsertSupabase, upsertLocal]);

	return { deletedMemo, handleDelete, handleUndo };
}
