import type { GetMemoResponse } from "@web-memo/shared/types";
import { useCallback, useMemo, useState } from "react";

interface UseMemoSelectionProps {
	memos: GetMemoResponse[];
}

export function useMemoSelection({ memos }: UseMemoSelectionProps) {
	const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

	const selectedMemos = useMemo(
		() => memos.filter((memo) => selectedMemoIds.includes(memo.id)),
		[memos, selectedMemoIds],
	);

	const isSelectingMode = useMemo(
		() => selectedMemoIds.length > 0,
		[selectedMemoIds.length],
	);

	const isMemoSelected = useCallback(
		(id: number) => selectedMemoIds.includes(id),
		[selectedMemoIds],
	);

	const toggleMemoSelection = useCallback((id: number) => {
		setSelectedMemoIds((prev) => {
			const index = prev.indexOf(id);
			if (index === -1) return [...prev, id];
			return prev.filter((memoId) => memoId !== id);
		});
	}, []);

	const setSelectedIds = useCallback((ids: number[]) => {
		setSelectedMemoIds(ids);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedMemoIds([]);
	}, []);

	return {
		selectedMemoIds,
		selectedMemos,
		isSelectingMode,
		isMemoSelected,
		toggleMemoSelection,
		setSelectedIds,
		clearSelection,
	};
}
