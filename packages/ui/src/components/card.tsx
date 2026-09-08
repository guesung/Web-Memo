import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "../utils";

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"bg-card text-card-foreground rounded-xl border shadow",
			className,
		)}
		{...props}
	/>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex flex-col space-y-1.5 p-6", className)}
		{...props}
	/>
));
CardHeader.displayName = "CardHeader";

/**
 * 카드의 제목.
 *
 * @description
 * 기본은 `div` 라 문서의 heading 개요에 잡히지 않는다. 제목이 실제로
 * 섹션을 여는 자리라면 `asChild` 로 heading 을 넘겨 의미를 살린다.
 * `<CardTitle asChild><h2>설정</h2></CardTitle>`
 */
const CardTitle = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		/** true 면 자식 요소를 그대로 쓰고 스타일만 얹는다 */
		asChild?: boolean;
	}
>(({ className, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			ref={ref}
			className={cn("font-semibold leading-none tracking-tight", className)}
			{...props}
		/>
	);
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		// 아래 여백이 없으면 내용이 카드 밑변에 붙는다. shadcn 원본의 p-6 pt-0 과
		// 같은 값이며, #193 에서 Dialog 버그를 고치다 함께 빠졌던 것을 되돌린다.
		className={cn("px-6 pb-6", className)}
		{...props}
	/>
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex items-center px-6 pb-6", className)}
		{...props}
	/>
));
CardFooter.displayName = "CardFooter";

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
