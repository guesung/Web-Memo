import type { ReactNode } from "react";

import { cn } from "../utils";

/** TextShimmer 컴포넌트의 props */
interface IFTextShimmerProps {
	/** shimmer 를 입힐 텍스트 */
	children: ReactNode;
	className?: string;
}

/**
 * 응답을 기다리는 동안 텍스트 위를 빛이 쓸고 지나가게 한다.
 *
 * @description
 * 출처: https://beui.dev (MIT License) — components/motion/text-shimmer
 * 스피너와 달리 "무엇을 기다리는지"를 문장으로 말할 수 있어, 요약·응답
 * 생성처럼 몇 초 이상 걸리는 대기에 쓴다. 그라데이션과
 * prefers-reduced-motion 대응은 global.css 의 .text-shimmer 에 있다.
 */
export function TextShimmer({ children, className }: IFTextShimmerProps) {
	return (
		<span className={cn("inline-block text-shimmer", className)}>
			{children}
		</span>
	);
}
