const SCROLL_INTERVAL = 50;
const SCROLL_UNIT = 30;
const AUTO_SCROLL_DELAY_MS = 50;

interface AutoScrollController {
	startScrollingDown: (container: HTMLElement) => void;
	startScrollingUp: (container: HTMLElement) => void;
	stopScrollingDown: () => void;
	stopScrollingUp: () => void;
	stopAll: () => void;
}

export function createAutoScrollController(): AutoScrollController {
	let bottomIntervalId: NodeJS.Timeout | null = null;
	let topIntervalId: NodeJS.Timeout | null = null;

	const startScrollingDown = (container: HTMLElement) => {
		if (bottomIntervalId) return;

		bottomIntervalId = setInterval(() => {
			const isAtBottom =
				container.scrollTop + container.clientHeight >= container.scrollHeight;

			if (isAtBottom) {
				stopScrollingDown();
				return;
			}

			container.scrollBy({ top: SCROLL_UNIT, behavior: "auto" });
		}, AUTO_SCROLL_DELAY_MS);
	};

	const startScrollingUp = (container: HTMLElement) => {
		if (topIntervalId) return;

		topIntervalId = setInterval(() => {
			const isAtTop = container.scrollTop === 0;

			if (isAtTop) {
				stopScrollingUp();
				return;
			}

			container.scrollBy({ top: -SCROLL_UNIT, behavior: "auto" });
		}, AUTO_SCROLL_DELAY_MS);
	};

	const stopScrollingDown = () => {
		if (bottomIntervalId) {
			clearInterval(bottomIntervalId);
			bottomIntervalId = null;
		}
	};

	const stopScrollingUp = () => {
		if (topIntervalId) {
			clearInterval(topIntervalId);
			topIntervalId = null;
		}
	};

	const stopAll = () => {
		stopScrollingDown();
		stopScrollingUp();
	};

	return {
		startScrollingDown,
		startScrollingUp,
		stopScrollingDown,
		stopScrollingUp,
		stopAll,
	};
}

interface AutoScrollCheckParams {
	mouseY: number;
	container: HTMLElement;
	scrollController: AutoScrollController;
}

export function updateAutoScroll({
	mouseY,
	container,
	scrollController,
}: AutoScrollCheckParams) {
	const isNearBottom = window.innerHeight - mouseY < SCROLL_INTERVAL;
	const isAtBottom =
		container.scrollTop + container.clientHeight >= container.scrollHeight;

	if (isNearBottom && !isAtBottom) {
		scrollController.startScrollingDown(container);
	} else {
		scrollController.stopScrollingDown();
	}

	const isNearTop = mouseY < SCROLL_INTERVAL;
	const isAtTop = container.scrollTop === 0;

	if (isNearTop && !isAtTop) {
		scrollController.startScrollingUp(container);
	} else {
		scrollController.stopScrollingUp();
	}
}
