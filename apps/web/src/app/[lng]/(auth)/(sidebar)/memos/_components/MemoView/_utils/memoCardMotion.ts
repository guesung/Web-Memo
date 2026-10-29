interface CardRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface PendingCardOpen {
	memoId: number;
	rect: CardRect;
	createdAt: number;
}

let pendingCardOpen: PendingCardOpen | undefined;

export const MEMO_CARD_MOTION_MS = 280;

export function captureMemoCardOpen(memoId: number, card: HTMLElement) {
	const rect = visibleCardPortion(card.getBoundingClientRect());
	if (!rect) {
		pendingCardOpen = undefined;
		return;
	}
	pendingCardOpen = {
		memoId,
		rect,
		createdAt: performance.now(),
	};
}

export function peekMemoCardOpen(memoId: number) {
	if (
		pendingCardOpen?.memoId !== memoId ||
		performance.now() - pendingCardOpen.createdAt > 1_000
	) {
		return undefined;
	}
	return pendingCardOpen.rect;
}

export function clearMemoCardOpen(memoId: number) {
	if (pendingCardOpen?.memoId === memoId) pendingCardOpen = undefined;
}

export function visibleMemoCardRect(memoId: number): CardRect | undefined {
	const card = document.querySelector<HTMLElement>(
		`[data-memo-card-id="${memoId}"]`,
	);
	if (!card) return undefined;
	return visibleCardPortion(card.getBoundingClientRect());
}

function visibleCardPortion(card: CardRect): CardRect | undefined {
	const left = Math.max(0, card.left);
	const top = Math.max(0, card.top);
	const width = Math.min(window.innerWidth, card.left + card.width) - left;
	const height = Math.min(window.innerHeight, card.top + card.height) - top;
	if (width <= 0 || height <= 0) return undefined;
	return { left, top, width, height };
}

export function cardMotionFrames(dialog: DOMRect, card: CardRect) {
	const visibleWidth = Math.min(card.width, dialog.width);
	const visibleHeight = Math.min(card.height, dialog.height);
	const horizontalInset = (dialog.width - visibleWidth) / 2;
	const verticalInset = (dialog.height - visibleHeight) / 2;
	const cardCenterX = card.left + card.width / 2;
	const cardCenterY = card.top + card.height / 2;
	const dialogCenterX = dialog.left + dialog.width / 2;
	const dialogCenterY = dialog.top + dialog.height / 2;
	return [
		{
			translate: `${cardCenterX - dialogCenterX}px ${cardCenterY - dialogCenterY}px`,
			clipPath: `inset(${verticalInset}px ${horizontalInset}px ${verticalInset}px ${horizontalInset}px round 16px)`,
			opacity: 0.96,
		},
		{
			translate: "0px 0px",
			clipPath: "inset(0px 0px 0px 0px round 12px)",
			opacity: 1,
		},
	];
}
