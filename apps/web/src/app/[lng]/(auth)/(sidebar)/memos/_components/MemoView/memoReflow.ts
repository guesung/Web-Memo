const REFLOW_DURATION_MS = 260;
const SEARCH_IDLE_MS = 220;

type MemoPosition = { left: number; top: number };
type MemoLayout = {
	path: string;
	filterKey: string;
	searchQuery: string;
	scrollY: number;
	positions: Map<string, MemoPosition>;
};

let previousLayout: MemoLayout | null = null;
let searchStartLayout: MemoLayout | null = null;
let searchTimer: number | undefined;
let removalArmed = false;
let activeAnimations: Animation[] = [];

/** 사용자가 삭제를 확정했을 때만 동일 조건에서 줄어든 목록의 이동을 허용한다. */
export const armMemoRemoval = () => {
	removalArmed = true;
};

export const disarmMemoRemoval = () => {
	removalArmed = false;
};

/** 필터 조작 직전, 현재 스크롤 위치에서 보이는 카드 좌표를 다시 잰다. */
export const captureMemoReflow = (container: HTMLElement) => {
	if (!previousLayout || previousLayout.path !== window.location.pathname)
		return;
	previousLayout = {
		...previousLayout,
		scrollY: window.scrollY,
		positions: getVisibleMemoPositions(container),
	};
};

/** 페이지를 떠날 때 대기 중인 검색과 카드 애니메이션을 정리한다. */
export const cancelMemoReflow = (path: string) => {
	activeAnimations.forEach((animation) => animation.cancel());
	activeAnimations = [];
	window.clearTimeout(searchTimer);
	searchStartLayout = null;
	removalArmed = false;
	if (window.location.pathname !== path) previousLayout = null;
};

/** egjs가 배치를 마친 뒤 공통 카드만 이전 화면 위치에서 새 위치로 옮긴다. */
export const settleMemoReflow = (
	container: HTMLElement,
	filterKey: string,
	searchQuery: string,
) => {
	window.clearTimeout(searchTimer);
	const path = window.location.pathname;
	const currentLayout: MemoLayout = {
		path,
		filterKey,
		searchQuery,
		scrollY: window.scrollY,
		positions: getVisibleMemoPositions(container),
	};
	const previous = previousLayout;
	if (!previous || previous.path !== path) {
		previousLayout = currentLayout;
		searchStartLayout = null;
		removalArmed = false;
		return;
	}

	if (
		previous.searchQuery !== searchQuery &&
		previous.filterKey === filterKey
	) {
		searchStartLayout ??= previous;
		searchTimer = window.setTimeout(() => {
			animateRetainedMemos(container, searchStartLayout, currentLayout);
			previousLayout = currentLayout;
			searchStartLayout = null;
		}, SEARCH_IDLE_MS);
		return;
	}

	const filterChanged = previous.filterKey !== filterKey;
	const removedMemo =
		removalArmed &&
		[...previous.positions.keys()].some(
			(id) => !currentLayout.positions.has(id),
		);
	if (filterChanged || removedMemo) {
		animateRetainedMemos(container, previous, currentLayout);
	}
	previousLayout = currentLayout;
	searchStartLayout = null;
	removalArmed = false;
};

const getVisibleMemoPositions = (container: HTMLElement) => {
	const positions = new Map<string, MemoPosition>();
	for (const memo of container.querySelectorAll<HTMLElement>(
		".memo-item[id]",
	)) {
		const rect = memo.getBoundingClientRect();
		if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
		positions.set(memo.id, { left: rect.left, top: rect.top });
	}
	return positions;
};

const animateRetainedMemos = (
	container: HTMLElement,
	previous: MemoLayout | null,
	current: MemoLayout,
) => {
	activeAnimations.forEach((animation) => animation.cancel());
	activeAnimations = [];
	if (
		!previous ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	)
		return;

	for (const memo of container.querySelectorAll<HTMLElement>(
		".memo-item[id]",
	)) {
		const before = previous.positions.get(memo.id);
		const after = current.positions.get(memo.id);
		if (!before || !after) continue;
		const x = before.left - after.left;
		const y = before.top - (current.scrollY - previous.scrollY) - after.top;
		if (Math.abs(x) < 2 && Math.abs(y) < 2) continue;
		// CSS translate composes with egjs's transform and the card's inner Framer Motion.
		const animation = memo.animate(
			[{ translate: `${x}px ${y}px` }, { translate: "0px 0px" }],
			{ duration: REFLOW_DURATION_MS, easing: "ease-out" },
		);
		activeAnimations.push(animation);
		animation.onfinish = () => {
			activeAnimations = activeAnimations.filter((item) => item !== animation);
		};
	}
};
