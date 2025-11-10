const ITEMS_PER_PAGE = 20;
const APPEND_DELAY_MS = 1;

interface GridItem {
	groupKey: number;
	key: number;
}

export function createInitialGridItems(): GridItem[] {
	return generateGridItems(0, ITEMS_PER_PAGE);
}

export function generateGridItems(
	groupKey: number,
	count: number,
): GridItem[] {
	const items: GridItem[] = [];
	const baseKey = groupKey * ITEMS_PER_PAGE;

	for (let i = 0; i < count; i++) {
		items.push({
			groupKey,
			key: baseKey + i,
		});
	}

	return items;
}

interface CalculateItemsToAppendParams {
	currentItemsCount: number;
	totalMemosCount: number;
}

export function calculateItemsToAppend({
	currentItemsCount,
	totalMemosCount,
}: CalculateItemsToAppendParams): number {
	const remainingItems = totalMemosCount - currentItemsCount;

	if (remainingItems <= 0) return 0;

	return Math.min(remainingItems, ITEMS_PER_PAGE);
}

export function getAppendDelay(): number {
	return APPEND_DELAY_MS;
}

export function getItemsPerPage(): number {
	return ITEMS_PER_PAGE;
}
