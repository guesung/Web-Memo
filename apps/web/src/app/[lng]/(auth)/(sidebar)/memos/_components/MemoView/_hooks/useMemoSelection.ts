import { useCallback, useMemo, useState } from "react";

interface UseMemoSelectionReturn {
	selectedMemoIds: number[];
	isSelectingMode: boolean;
	checkMemoSelected: (id: number) => boolean;
	handleSelectMemoItem: (id: number) => void;
	setSelectedMemoIds: React.Dispatch<React.SetStateAction<number[]>>;
	clearSelection: () => void;
}

export default function useMemoSelection(): UseMemoSelectionReturn {
	const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

	const isSelectingMode = useMemo(
		() => selectedMemoIds.length > 0,
		[selectedMemoIds],
	);

	const checkMemoSelected = useCallback(
		(id: number) => selectedMemoIds.includes(id),
		[selectedMemoIds],
	);

	const handleSelectMemoItem = useCallback((id: number) => {
		setSelectedMemoIds((prev) => {
			const index = prev.indexOf(id);
			if (index === -1) return [...prev, id];
			return prev.filter((memoId) => memoId !== id);
		});
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedMemoIds([]);
	}, []);

	return {
		selectedMemoIds,
		isSelectingMode,
		checkMemoSelected,
		handleSelectMemoItem,
		setSelectedMemoIds,
		clearSelection,
	};
}
