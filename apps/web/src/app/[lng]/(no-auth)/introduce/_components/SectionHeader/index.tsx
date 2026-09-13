import { cn } from "@web-memo/shared/utils";

/**
 * 랜딩 섹션의 제목 묶음.
 * @description
 * 이전에는 여섯 섹션이 `text-3xl sm:text-4xl font-bold` + 설명 문단을 각자 복붙하고
 * 있었다. 굵기를 400으로 내리고 자간을 좁히는 것이 이번 개편의 타이포 방침이라,
 * 그 판단이 한 곳에만 있어야 한다.
 */

interface SectionHeaderProps {
	/** 섹션 위에 붙는 짧은 분류 라벨. 없으면 생략된다 */
	eyebrow?: string;
	title: string;
	description?: string;
	/** 가운데 정렬이 기본. 좌측 정렬이 필요한 섹션만 `false` */
	isCentered?: boolean;
	className?: string;
}

export default function SectionHeader({
	eyebrow,
	title,
	description,
	isCentered = true,
	className,
}: SectionHeaderProps) {
	return (
		<div
			className={cn(
				"mb-12 max-w-2xl",
				isCentered && "mx-auto text-center",
				className,
			)}
		>
			{eyebrow ? (
				<p className="mb-3 text-sm text-muted-foreground">{eyebrow}</p>
			) : null}

			<h2 className="text-3xl font-normal tracking-[-0.015em] sm:text-4xl">
				{title}
			</h2>

			{description ? (
				<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
					{description}
				</p>
			) : null}
		</div>
	);
}
