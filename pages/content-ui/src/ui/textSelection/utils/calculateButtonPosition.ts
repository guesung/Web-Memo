export const calculateButtonPosition = (
	selectionRect: DOMRect,
	buttonSize: { width: number; height: number },
) => {
	const GAP = 8;
	const viewport = {
		width: window.innerWidth,
		height: window.innerHeight,
		scrollY: window.scrollY,
		scrollX: window.scrollX,
	};

	let top = selectionRect.top + viewport.scrollY - buttonSize.height - GAP;
	let left = selectionRect.left + viewport.scrollX + selectionRect.width / 2 - buttonSize.width / 2;

	if (left + buttonSize.width > viewport.width + viewport.scrollX) {
		left = selectionRect.left + viewport.scrollX - buttonSize.width - GAP;
	}

	if (top < viewport.scrollY) {
		top = selectionRect.bottom + viewport.scrollY + GAP;
	}

	top = Math.max(viewport.scrollY + GAP, top);
	left = Math.max(GAP, Math.min(viewport.width - buttonSize.width - GAP, left));

	return { top, left };
};
