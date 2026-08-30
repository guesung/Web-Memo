import { useDrag } from "@src/hooks";
import type { RefObject } from "react";
import { useRef } from "react";

const SCROLL_INTERVAL = 50;
const SCROLL_UNIT = 30;

interface UseDragSelectionProps {
	containerId: string;
	dragBoxRef: RefObject<HTMLDivElement | null>;
	onSelectionChange: (selectedIds: number[]) => void;
}

export default function useDragSelection({
	containerId,
	dragBoxRef,
	onSelectionChange,
}: UseDragSelectionProps) {
	const rafRef = useRef<number | undefined>(undefined);
	const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const topTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearScrollIntervals = () => {
		if (bottomTimeoutRef.current) {
			clearInterval(bottomTimeoutRef.current);
			bottomTimeoutRef.current = null;
		}
		if (topTimeoutRef.current) {
			clearInterval(topTimeoutRef.current);
			topTimeoutRef.current = null;
		}
	};

	const handleAutoScroll = (scroller: Element, dragEndY: number): void => {
		const isNearBottom = window.innerHeight - dragEndY < SCROLL_INTERVAL;
		const isAtBottom =
			scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight;

		if (isNearBottom && !isAtBottom && !bottomTimeoutRef.current) {
			bottomTimeoutRef.current = setInterval(() => {
				if (
					scroller.scrollTop + scroller.clientHeight >=
					scroller.scrollHeight
				) {
					clearInterval(bottomTimeoutRef.current!);
					bottomTimeoutRef.current = null;
					return;
				}
				scroller.scrollBy({ top: SCROLL_UNIT, behavior: "auto" });
			}, 50);
		} else if (!isNearBottom && bottomTimeoutRef.current) {
			clearInterval(bottomTimeoutRef.current);
			bottomTimeoutRef.current = null;
		}

		const isNearTop = dragEndY < SCROLL_INTERVAL;
		const isAtTop = scroller.scrollTop === 0;

		if (isNearTop && !isAtTop && !topTimeoutRef.current) {
			topTimeoutRef.current = setInterval(() => {
				if (scroller.scrollTop === 0) {
					clearInterval(topTimeoutRef.current!);
					topTimeoutRef.current = null;
					return;
				}
				scroller.scrollBy({ top: -SCROLL_UNIT, behavior: "auto" });
			}, 50);
		} else if (!isNearTop && topTimeoutRef.current) {
			clearInterval(topTimeoutRef.current);
			topTimeoutRef.current = null;
		}
	};

	const updateDragBoxPosition = (
		dragBox: HTMLDivElement,
		left: number,
		top: number,
		width: number,
		height: number,
	): void => {
		dragBox.style.transform = `translate(${left}px, ${top}px) scale(${width}, ${height})`;
	};

	const findSelectedMemoIds = (
		left: number,
		top: number,
		right: number,
		bottom: number,
	): number[] => {
		const memoElements = document.querySelectorAll(".memo-item");
		return [...memoElements]
			.filter((element) => {
				const rect = element.getBoundingClientRect();
				return (
					rect.left < right &&
					rect.right > left &&
					rect.top < bottom &&
					rect.bottom > top
				);
			})
			.map((element) => Number(element.id));
	};

	useDrag({
		onMouseDown: (mouseDownEvent: MouseEvent) => {
			const [dragStartX, dragStartY] = [
				mouseDownEvent.clientX,
				mouseDownEvent.clientY,
			];
			const dragStartTarget = mouseDownEvent.target as HTMLElement;

			const isMemoItem = dragStartTarget.closest(".memo-item");
			const isMemoGrid = dragStartTarget.closest(`#${containerId}`);
			if (!isMemoGrid || isMemoItem) return;

			// 스크롤 주체는 그리드가 아니라 문서다. 드래그 시작 판정만 그리드로 한다.
			const scroller = document.scrollingElement;
			if (!scroller) return;
			const initialScrollTop = scroller.scrollTop;

			const dragBox = dragBoxRef.current;
			if (!dragBox) return;

			let lastMouseEvent: MouseEvent | null = null;

			const updateDragBox = () => {
				if (!lastMouseEvent || !dragBox) return;

				const [dragEndX, dragEndY] = [
					lastMouseEvent.clientX,
					lastMouseEvent.clientY,
				];

				handleAutoScroll(scroller, dragEndY);

				const scrolledDragStartY =
					dragStartY - (scroller.scrollTop - initialScrollTop);

				const [left, top, right, bottom] = [
					Math.min(dragStartX, dragEndX),
					Math.min(scrolledDragStartY, dragEndY),
					Math.max(dragStartX, dragEndX),
					Math.max(scrolledDragStartY, dragEndY),
				];

				const [width, height] = [
					Math.abs(dragEndX - dragStartX),
					Math.abs(dragEndY - scrolledDragStartY),
				];

				updateDragBoxPosition(dragBox, left, top, width, height);

				const selectedIds = findSelectedMemoIds(left, top, right, bottom);
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
				document.body.removeEventListener("mousemove", handleMouseMove);
				if (rafRef.current) {
					cancelAnimationFrame(rafRef.current);
					rafRef.current = undefined;
				}

				if (dragBoxRef.current) {
					dragBoxRef.current.style.transform = "";
				}

				clearScrollIntervals();
			};

			document.body.addEventListener("mousemove", handleMouseMove);
			document.body.addEventListener("mouseup", handleMouseUp, { once: true });
		},
	});

	return {
		rafRef,
		clearScrollIntervals,
	};
}
