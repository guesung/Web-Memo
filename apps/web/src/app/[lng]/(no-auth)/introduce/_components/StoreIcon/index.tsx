/**
 * 스토어 브랜드 로고.
 * @description
 * 이 레포는 아이콘을 항상 `lucide-react`로 쓰고 인라인 `<svg>`를 새로 만들지 않지만,
 * Apple·Google Play 로고는 lucide에 없다. 그래서 **브랜드 로고에 한해 이 파일에서만**
 * 인라인 path를 허용한다. 이 예외를 한 곳에 가두는 것이 이 파일의 존재 이유다.
 *
 * Chrome은 lucide에 있으므로 여기에 두지 않는다 — 호출부에서 `lucide-react`의
 * `Chrome`을 그대로 쓴다.
 */

interface StoreIconProps {
	/** 적용할 클래스. 크기는 호출부가 정한다 */
	className?: string;
}

/** Apple(App Store) 로고 */
export function AppleIcon({ className }: StoreIconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 384 512"
			fill="currentColor"
			role="img"
			aria-label="Apple"
		>
			<title>Apple</title>
			<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
		</svg>
	);
}

/** Google Play 로고 */
export function GooglePlayIcon({ className }: StoreIconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 512 512"
			fill="currentColor"
			role="img"
			aria-label="Google Play"
		>
			<title>Google Play</title>
			<path d="M47.6 26.9C40.3 34.6 36 46.5 36 62v388c0 15.5 4.3 27.4 11.6 35.1l1.3 1.3 217.3-217.3v-5.1L48.9 25.6l-1.3 1.3zM339 336.5l-72.4-72.4v-5.1l72.5-72.5 1.6 1 85.8 48.8c24.5 13.9 24.5 36.7 0 50.6l-85.8 48.7-1.7.9zM316.8 358.8L242.6 284.6 24 503.2c8.1 8.5 21.4 9.6 36.4 1.1l256.4-145.5zM316.8 153.2L60.4 7.7C45.4-.8 32.1.3 24 8.8l218.6 218.6 74.2-74.2z" />
		</svg>
	);
}
