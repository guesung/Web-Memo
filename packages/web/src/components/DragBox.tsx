"use client";

import { cn } from "@extension/ui";
import { forwardRef } from "react";

interface DragBoxProps {
	className?: string;
}

export default forwardRef<HTMLDivElement, DragBoxProps>(function DragBox(
	{ className },
	ref,
) {
	return (
		<div
			className={cn(
				"bg-primary/20 pointer-events-none fixed left-0 top-0 z-[40] h-[1px] w-[1px] origin-top-left",
				className,
			)}
			ref={ref}
		/>
	);
});
