import type { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import type { ComponentProps } from "react";
import { useState } from "react";

const MEMO_UNIT = 20;

interface MemoItem {
	groupKey: number;
	key: number;
}

const getItems = (nextGroupKey: number, count: number): MemoItem[] => {
	const nextItems: MemoItem[] = [];
	const nextKey = nextGroupKey * MEMO_UNIT;

	for (let i = 0; i < count; ++i) {
		nextItems.push({ groupKey: nextGroupKey, key: nextKey + i });
	}
	return nextItems;
};

interface UseMemoInfiniteScrollProps {
	totalMemoCount: number;
}

interface UseMemoInfiniteScrollReturn {
	items: MemoItem[];
	handleRequestAppend: ComponentProps<
		typeof MasonryInfiniteGrid
	>["onRequestAppend"];
}

export default function useMemoInfiniteScroll({
	totalMemoCount,
}: UseMemoInfiniteScrollProps): UseMemoInfiniteScrollReturn {
	const [items, setItems] = useState<MemoItem[]>(() => getItems(0, MEMO_UNIT));

	const handleRequestAppend: ComponentProps<
		typeof MasonryInfiniteGrid
	>["onRequestAppend"] = ({ groupKey = 0, currentTarget, wait, ready }) => {
		if (items.length >= totalMemoCount) return;

		const nextGroupKey = +groupKey + 1;
		const maxAddItem =
			items.length + MEMO_UNIT > totalMemoCount
				? totalMemoCount - items.length
				: MEMO_UNIT;

		if (maxAddItem === 0) return;

		wait();
		currentTarget.appendPlaceholders(maxAddItem, nextGroupKey);

		setTimeout(() => {
			ready();
			setItems((prevItems) => [
				...prevItems,
				...getItems(nextGroupKey, maxAddItem),
			]);
		}, 1);
	};

	return {
		items,
		handleRequestAppend,
	};
}

export { MEMO_UNIT };
export type { MemoItem };
