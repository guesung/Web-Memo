interface DragBoxBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

interface CalculateDragBoxBoundsParams {
	dragStartX: number;
	dragStartY: number;
	dragEndX: number;
	dragEndY: number;
	scrollOffset: number;
}

export function calculateDragBoxBounds({
	dragStartX,
	dragStartY,
	dragEndX,
	dragEndY,
	scrollOffset,
}: CalculateDragBoxBoundsParams): DragBoxBounds {
	const adjustedStartY = dragStartY + scrollOffset;

	const left = Math.min(dragStartX, dragEndX);
	const top = Math.min(adjustedStartY, dragEndY);
	const right = Math.max(dragStartX, dragEndX);
	const bottom = Math.max(adjustedStartY, dragEndY);

	const width = Math.abs(dragEndX - dragStartX);
	const height = Math.abs(dragEndY - adjustedStartY);

	return { left, top, right, bottom, width, height };
}

export function applyDragBoxTransform(
	element: HTMLElement,
	bounds: DragBoxBounds,
) {
	element.style.transform = `translate(${bounds.left}px, ${bounds.top}px) scale(${bounds.width}, ${bounds.height})`;
}

export function resetDragBoxTransform(element: HTMLElement) {
	element.style.transform = "";
}
