import { type PointerEvent, type ReactNode, useRef, useState } from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

const TOOLTIP_DELAY_MS = 200;

/** IconTooltip 컴포넌트의 props */
interface IFIconTooltipProps {
	/** 말풍선에 보여 줄 문구. 비어 있으면 말풍선 없이 children만 그린다 */
	label?: string;
	/** 말풍선이 붙는 아이콘 버튼. 비활성 버튼도 hover를 받도록 span으로 감싼다 */
	children: ReactNode;
}

/**
 * 아이콘 전용 컨트롤에 hover·포커스 시 의미를 알려 주는 말풍선을 붙인다.
 *
 * @description 확장 사이드 패널과 웹 메모 카드가 같은 말풍선을 쓴다.
 */
export function IconTooltip({ label, children }: IFIconTooltipProps) {
	const [isOpen, setIsOpen] = useState(false);
	const lastPointerTypeRef = useRef<string | null>(null);

	if (!label) {
		return children;
	}

	// Radix는 트리거를 누르면 말풍선을 닫는다. 토글 버튼은 누른 뒤 바뀐 동작을 바로 보여줘야
	// 하므로, 닫힘이 처리된 직후 다시 연다. 터치는 원래 말풍선을 띄우지 않으므로 제외한다.
	const handlePointerDown = (event: PointerEvent) => {
		lastPointerTypeRef.current = event.pointerType;
	};
	const handleClick = () => {
		if (lastPointerTypeRef.current === "touch") return;
		queueMicrotask(() => setIsOpen(true));
	};

	return (
		<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
			<Tooltip open={isOpen} onOpenChange={setIsOpen}>
				<TooltipTrigger
					asChild
					onPointerDown={handlePointerDown}
					onClick={handleClick}
				>
					<span className="inline-flex">{children}</span>
				</TooltipTrigger>
				<TooltipContent side="top">{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
