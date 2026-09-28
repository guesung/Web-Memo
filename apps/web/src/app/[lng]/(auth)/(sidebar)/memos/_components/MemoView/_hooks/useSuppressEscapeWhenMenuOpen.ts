import { useEffect, useRef } from "react";

/**
 * 메뉴가 열려 있는 상태에서 Escape를 눌렀는지 판정하는 ref를 반환한다.
 *
 * 메뉴가 열려 있으면 Escape의 주인은 그 레이어다. Radix는 최상위 레이어에만 Escape를
 * 주므로 DialogContent의 onEscapeKeyDown은 아예 불리지 않고, window 리스너인
 * useKeyboardBind만 돌아 메모 상세까지 닫혀버린다.
 *
 * 판정은 눌린 순간에 해야 한다. window 버블 시점엔 Radix가 이미 메뉴를 닫아
 * data-state가 closed이고, 포퍼 래퍼로 보면 툴팁·팝오버가 걸리는 데다 닫히는
 * 애니메이션 동안 래퍼가 남아 직후의 Escape까지 삼킨다.
 */
export default function useSuppressEscapeWhenMenuOpen() {
	const wasMenuOpenOnEscapeRef = useRef(false);

	useEffect(function trackMenuOpenOnEscape() {
		const handleDocumentKeyDownCapture = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;

			wasMenuOpenOnEscapeRef.current = !!document.querySelector(
				'[role="menu"][data-state="open"]',
			);
		};

		document.addEventListener("keydown", handleDocumentKeyDownCapture, true);
		return () => {
			document.removeEventListener(
				"keydown",
				handleDocumentKeyDownCapture,
				true,
			);
		};
	}, []);

	return { wasMenuOpenOnEscapeRef };
}
