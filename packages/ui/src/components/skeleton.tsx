import { cn } from "../utils";

/**
 * 로딩 중인 자리를 대신 채우는 판
 *
 * @description
 * 배경을 foreground 알파로 잡는다. 스켈레톤은 페이지 바닥과 카드 안 양쪽에
 * 놓이는데, --muted 가 --card 와 같은 값이라 카드 위에서는 보이지 않게 된다.
 */
function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("bg-foreground/5 skeleton-shimmer rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
