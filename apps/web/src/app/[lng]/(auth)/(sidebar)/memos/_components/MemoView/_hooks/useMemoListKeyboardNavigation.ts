import { useEffect } from "react";
import { isTypingTarget } from "../../../_utils";

const MEMO_CARD_SELECTOR = '.memo-item[role="button"]';
// 한글 자판에서는 key가 ㅓ·ㅏ로 들어오므로 자판과 무관한 code로 판정한다.
const MOVE_STEP: Record<string, number> = { KeyJ: 1, KeyK: -1 };

/** 다이얼로그가 떠 있거나 메뉴 안에서 누른 키면, 그쪽이 키를 쓰므로 목록은 움직이지 않는다. */
const isKeyOwnedByOverlay = (target: EventTarget | null) =>
	document.querySelector('[role="dialog"], [role="alertdialog"]') !== null ||
	(target instanceof Element &&
		target.closest('[role="menu"], [role="listbox"]') !== null);

const findFirstVisibleIndex = (cards: HTMLElement[]) => {
	const index = cards.findIndex(
		(card) => card.getBoundingClientRect().bottom > 0,
	);
	return index === -1 ? 0 : index;
};

/**
 * J/K로 목록 카드 사이를 옮겨 다닌다.
 * @description 카드에 실제 포커스를 주므로 기존 포커스 링과 Enter로 상세 열기를 그대로 쓴다.
 * 고른 카드가 없으면 화면에 보이는 첫 카드부터 시작하고, 끝에서는 멈춘다.
 */
export default function useMemoListKeyboardNavigation() {
	useEffect(function moveFocusBetweenCards() {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
				return;
			const step = MOVE_STEP[event.code];
			if (step === undefined) return;
			if (isTypingTarget(event.target) || isKeyOwnedByOverlay(event.target))
				return;

			const cards = Array.from(
				document.querySelectorAll<HTMLElement>(MEMO_CARD_SELECTOR),
			);
			if (cards.length === 0) return;

			const currentIndex = cards.findIndex(
				(card) => card === document.activeElement,
			);
			const nextIndex =
				currentIndex === -1
					? findFirstVisibleIndex(cards)
					: Math.min(Math.max(currentIndex + step, 0), cards.length - 1);

			event.preventDefault();
			cards[nextIndex].focus({ preventScroll: true });
			cards[nextIndex].scrollIntoView({ block: "nearest" });
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);
}
