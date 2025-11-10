interface Bounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export function isElementInBounds(
	elementRect: DOMRect,
	bounds: Bounds,
): boolean {
	return (
		elementRect.left < bounds.right &&
		elementRect.right > bounds.left &&
		elementRect.top < bounds.bottom &&
		elementRect.bottom > bounds.top
	);
}

export function getSelectedMemoIds(
	memoSelector: string,
	bounds: Bounds,
): number[] {
	const memoElements = document.querySelectorAll(memoSelector);

	return Array.from(memoElements)
		.filter((element) => {
			const rect = element.getBoundingClientRect();
			return isElementInBounds(rect, bounds);
		})
		.map((element) => Number(element.id));
}
