import { useEffect, useState } from "react";

/** 마우스 위치 추적 간격. 남의 페이지에서 매 픽셀마다 도는 핸들러를 만들지 않는다 */
const HOVER_THROTTLE_MS = 100;

/** 커서와 툴팁 사이 간격 */
const CURSOR_OFFSET_PX = 16;

/** 마우스가 올라간 하이라이트의 코멘트와 표시 좌표 */
interface TooltipState {
	note: string;
	x: number;
	y: number;
}

/** HighlightTooltip에 전달하는 인자 */
interface HighlightTooltipProps {
	/** 좌표로 하이라이트 id를 찾는다. 없으면 null */
	hitTest: (x: number, y: number) => number | null;
	/** 하이라이트 id → 코멘트. 코멘트가 없는 하이라이트는 담기지 않는다 */
	notesById: Map<number, string>;
}

/**
 * 코멘트가 있는 하이라이트에 마우스를 올리면 코멘트를 띄운다.
 * @description CSS Custom Highlight API는 DOM 요소를 만들지 않아 밑줄에 마우스 이벤트를
 * 걸 수 없다. 그래서 문서 전체의 `mousemove`를 throttle해 받아 `hitTest`로 판별한다.
 * 스타일을 인라인으로 두는 이유는 요소가 하나뿐이라 클래스 체계가 필요 없고, Shadow DOM
 * 스타일시트 주입 타이밍에 의존하지 않는 편이 확실하기 때문이다.
 */
export function HighlightTooltip({
	hitTest,
	notesById,
}: HighlightTooltipProps) {
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	useEffect(() => {
		let lastRunAt = 0;
		let trailingTimer: ReturnType<typeof setTimeout> | null = null;

		function evaluate(x: number, y: number): void {
			const id = hitTest(x, y);
			const note = id === null ? undefined : notesById.get(id);

			if (!note) {
				setTooltip(null);
				return;
			}

			setTooltip({ note, x, y });
		}

		function handleMouseMove(event: MouseEvent): void {
			const now = Date.now();
			const elapsed = now - lastRunAt;

			if (elapsed < HOVER_THROTTLE_MS) {
				if (trailingTimer !== null) {
					clearTimeout(trailingTimer);
				}

				const { clientX, clientY } = event;

				trailingTimer = setTimeout(() => {
					trailingTimer = null;
					lastRunAt = Date.now();
					evaluate(clientX, clientY);
				}, HOVER_THROTTLE_MS - elapsed);

				return;
			}

			lastRunAt = now;
			evaluate(event.clientX, event.clientY);
		}

		document.addEventListener("mousemove", handleMouseMove, { passive: true });

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);

			if (trailingTimer !== null) {
				clearTimeout(trailingTimer);
			}
		};
	}, [hitTest, notesById]);

	if (!tooltip) {
		return null;
	}

	return (
		<div
			style={{
				position: "fixed",
				left: tooltip.x + CURSOR_OFFSET_PX,
				top: tooltip.y + CURSOR_OFFSET_PX,
				zIndex: 2147483647,
				maxWidth: "320px",
				padding: "8px 10px",
				borderRadius: "8px",
				background: "rgba(23, 23, 23, 0.95)",
				color: "#fafafa",
				fontSize: "13px",
				lineHeight: 1.5,
				whiteSpace: "pre-wrap",
				pointerEvents: "none",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
			}}
		>
			{tooltip.note}
		</div>
	);
}
