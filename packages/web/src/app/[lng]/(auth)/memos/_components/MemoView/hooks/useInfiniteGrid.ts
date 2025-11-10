import type { ComponentProps } from "react";
import { useState } from "react";
import type { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import {
	calculateItemsToAppend,
	createInitialGridItems,
	generateGridItems,
	getAppendDelay,
	getItemsPerPage,
} from "../utils/infiniteGrid.utils";

interface UseInfiniteGridParams {
	totalItemsCount: number;
}

export function useInfiniteGrid({ totalItemsCount }: UseInfiniteGridParams) {
	const [items, setItems] = useState(() => createInitialGridItems());

	const handleRequestAppend: ComponentProps<
		typeof MasonryInfiniteGrid
	>["onRequestAppend"] = ({ groupKey = 0, currentTarget, wait, ready }) => {
		const itemsToAppend = calculateItemsToAppend({
			currentItemsCount: items.length,
			totalMemosCount: totalItemsCount,
		});

		if (itemsToAppend === 0) return;

		const nextGroupKey = Number(groupKey) + 1;

		wait();
		currentTarget.appendPlaceholders(getItemsPerPage(), nextGroupKey);

		setTimeout(() => {
			ready();
			setItems((prevItems) => [
				...prevItems,
				...generateGridItems(nextGroupKey, itemsToAppend),
			]);
		}, getAppendDelay());
	};

	return {
		items,
		handleRequestAppend,
	};
}
