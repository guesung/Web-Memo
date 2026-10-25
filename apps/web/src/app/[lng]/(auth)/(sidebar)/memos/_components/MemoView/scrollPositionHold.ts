/** 붙잡아 둔 스크롤 위치. 붙잡지 않았으면 null이다. */
let heldScrollY: number | null = null;
let releaseTimerId: number | undefined;

/**
 * 메모 카드 높이를 바꾸기 직전의 스크롤 위치를 붙잡는다.
 * @description egjs InfiniteGrid는 재배치 뒤 보이던 그룹의 중심을 유지하려고
 * window.scrollBy를 직접 호출한다. 카드 20개가 한 그룹이라 카드를 펼치면 그룹 중심이
 * 내려가고 화면이 그만큼 아래로 밀린다. 사용자가 직접 스크롤하거나 3초가 지나면 놓아서
 * 무한 스크롤의 재배치까지 되돌리지 않는다.
 */
export const holdScrollPosition = () => {
	releaseScrollPosition();
	heldScrollY = window.scrollY;
	releaseTimerId = window.setTimeout(releaseScrollPosition, 3000);
	for (const eventName of ["wheel", "touchmove", "keydown"]) {
		window.addEventListener(eventName, releaseScrollPosition, {
			once: true,
			passive: true,
		});
	}
};

/** egjs 재배치가 끝났을 때 붙잡아 둔 위치로 되돌린다. */
export const restoreHeldScrollPosition = () => {
	if (heldScrollY === null || window.scrollY === heldScrollY) {
		return;
	}

	window.scrollTo(0, heldScrollY);
};

const releaseScrollPosition = () => {
	heldScrollY = null;
	window.clearTimeout(releaseTimerId);
	for (const eventName of ["wheel", "touchmove", "keydown"]) {
		window.removeEventListener(eventName, releaseScrollPosition);
	}
};
