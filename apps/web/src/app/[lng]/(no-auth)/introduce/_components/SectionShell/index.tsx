import { cn } from "@web-memo/shared/utils";
import type { ReactNode } from "react";

/**
 * 랜딩 섹션의 공통 껍데기.
 * @description
 * 세로 리듬(80px)·컨테이너 폭(1200px)·배경 밴드를 한 곳에서 정한다.
 * 이전에는 11개 섹션이 각자 `py-20` + `mx-auto max-w-6xl px-4`를 복붙하고 있었고,
 * 그 탓에 배경 교대 패턴이 중간에서 끊겨 있었다.
 *
 * 배경은 섹션이 스스로 고르지 않는다 — 인접한 두 섹션이 같은 밴드를 쓰지 않아야
 * 하므로 조립부(`page.tsx`)가 순서를 보고 지정한다.
 */

/** 섹션 배경 밴드. `canvas`와 `fog`를 번갈아 쓴다 */
export type TSectionBackground = "canvas" | "fog";

interface SectionShellProps {
	children: ReactNode;
	/** 배경 밴드. 조립부가 인접 섹션과 다르게 지정한다 */
	background?: TSectionBackground;
	/** 앵커 스크롤 대상일 때만 준다 */
	id?: string;
	/** 컨테이너에 덧붙일 클래스 */
	className?: string;
}

const BACKGROUND_CLASS: Record<TSectionBackground, string> = {
	canvas: "bg-background",
	fog: "bg-muted",
};

export default function SectionShell({
	children,
	background = "canvas",
	id,
	className,
}: SectionShellProps) {
	return (
		<section id={id} className={cn("py-20", BACKGROUND_CLASS[background])}>
			<div className={cn("mx-auto max-w-[1200px] px-6", className)}>
				{children}
			</div>
		</section>
	);
}
