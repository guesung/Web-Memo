/**
 * 모션 토큰 — 이징 곡선과 스프링 물리값.
 *
 * @description
 * 출처: https://beui.dev (MIT License) — `lib/ease.ts`
 * 값은 원본 그대로 두고 주석만 옮겼다. 여기 있는 값 밖의 이징·스프링을
 * 컴포넌트에서 직접 쓰지 않는다. 화면마다 다른 물리값을 쓰면 같은 제품이
 * 아닌 것처럼 움직인다.
 */

/**
 * 기본 감속 곡선. 등장·이동 등 대부분의 전환에 쓴다.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * 가속 후 감속. 사라졌다 다시 나타나는 왕복 전환에 쓴다.
 */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/**
 * 시트·드로어가 밀려 올라오는 전용 곡선.
 */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/**
 * `EASE_OUT`의 CSS 문자열 형태. 인라인 style transition에 쓴다.
 */
export const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * 버튼 등 눌리는 표면의 누름 피드백.
 */
export const SPRING_PRESS = {
	type: "spring",
	stiffness: 500,
	damping: 30,
	mass: 0.6,
} as const;

/**
 * 컨트롤 안에서 라벨·아이콘이 자리를 맞바꾸는 전환.
 */
export const SPRING_SWAP = {
	type: "spring",
	stiffness: 460,
	damping: 30,
	mass: 0.55,
} as const;

/**
 * 모달·시트처럼 위에 떠서 등장하는 패널.
 */
export const SPRING_PANEL = {
	type: "spring",
	stiffness: 420,
	damping: 40,
	mass: 0.5,
} as const;

/**
 * layoutId 로 위치를 옮겨 다니는 인디케이터·패널의 활공.
 */
export const SPRING_LAYOUT = {
	type: "spring",
	stiffness: 360,
	damping: 32,
	mass: 0.6,
} as const;

/**
 * 커서를 따라가는 장식용 추적 물리값.
 */
export const SPRING_MOUSE = {
	stiffness: 200,
	damping: 15,
	mass: 0.3,
} as const;

/**
 * 드래그되는 핸들·필. 임계 감쇠라 끝에서 튕기지 않는다.
 */
export const SPRING_GLIDE = {
	stiffness: 700,
	damping: 50,
	mass: 0.5,
} as const;
