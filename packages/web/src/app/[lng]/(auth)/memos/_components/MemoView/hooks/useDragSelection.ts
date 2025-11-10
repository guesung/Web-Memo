import { useRef } from "react";
import {
	applyDragBoxTransform,
	calculateDragBoxBounds,
	resetDragBoxTransform,
} from "../utils/dragBox.utils";
import {
	createAutoScrollController,
	updateAutoScroll,
} from "../utils/autoScroll.utils";
import { getSelectedMemoIds } from "../utils/collision.utils";

interface UseDragSelectionParams {
	containerId: string;
	dragBoxRef: React.RefObject<HTMLDivElement>;
	onSelectionChange: (selectedIds: number[]) => void;
}

const MEMO_ITEM_SELECTOR = ".memo-item";

export function useDragSelection({
	containerId,
	dragBoxRef,
	onSelectionChange,
}: UseDragSelectionParams) {
	const rafRef = useRef<number>();
	const scrollControllerRef = useRef(createAutoScrollController());

	const handleMouseDown = (mouseDownEvent: MouseEvent) => {
		const dragStartPosition = {
			x: mouseDownEvent.clientX,
			y: mouseDownEvent.clientY,
		};

		const dragStartTarget = mouseDownEvent.target as HTMLElement;

		if (!shouldStartDrag(dragStartTarget, containerId)) {
			return;
		}

		const container = document.getElementById(containerId);
		if (!container) return;

		const initialScrollTop = container.scrollTop;
		const dragBox = dragBoxRef.current;
		if (!dragBox) return;

		let lastMouseEvent: MouseEvent | null = null;

		const updateDragBox = () => {
			if (!lastMouseEvent || !dragBox) return;

			const currentMousePosition = {
				x: lastMouseEvent.clientX,
				y: lastMouseEvent.clientY,
			};

			// Auto-scroll handling
			updateAutoScroll({
				mouseY: currentMousePosition.y,
				container,
				scrollController: scrollControllerRef.current,
			});

			// Calculate drag box bounds
			const scrollOffset = initialScrollTop - container.scrollTop;
			const bounds = calculateDragBoxBounds({
				dragStartX: dragStartPosition.x,
				dragStartY: dragStartPosition.y,
				dragEndX: currentMousePosition.x,
				dragEndY: currentMousePosition.y,
				scrollOffset,
			});

			// Apply drag box transform
			applyDragBoxTransform(dragBox, bounds);

			// Update selected memos
			const selectedIds = getSelectedMemoIds(MEMO_ITEM_SELECTOR, bounds);
			onSelectionChange(selectedIds);

			rafRef.current = requestAnimationFrame(updateDragBox);
		};

		const handleMouseMove = (mouseMoveEvent: globalThis.MouseEvent) => {
			mouseMoveEvent.stopPropagation();
			lastMouseEvent = mouseMoveEvent;

			if (!rafRef.current) {
				rafRef.current = requestAnimationFrame(updateDragBox);
			}
		};

		const handleMouseUp = () => {
			cleanup();
			document.body.removeEventListener("mousemove", handleMouseMove);
		};

		document.body.addEventListener("mousemove", handleMouseMove);
		document.body.addEventListener("mouseup", handleMouseUp, { once: true });
	};

	const cleanup = () => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = undefined;
		}

		if (dragBoxRef.current) {
			resetDragBoxTransform(dragBoxRef.current);
		}

		scrollControllerRef.current.stopAll();
	};

	return {
		handleMouseDown,
		cleanup,
	};
}

function shouldStartDrag(target: HTMLElement, containerId: string): boolean {
	const isMemoItem = target.closest(MEMO_ITEM_SELECTOR);
	const isMemoGrid = target.closest(`#${containerId}`);

	return Boolean(isMemoGrid && !isMemoItem);
}
