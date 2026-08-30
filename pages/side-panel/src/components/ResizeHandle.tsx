import { cn } from "@web-memo/ui";
import { GripHorizontal } from "lucide-react";

interface ResizeHandleProps extends React.ComponentProps<"div"> {
	/** 핸들 바로 위 영역이 차지한 비율(%). 스크린 리더가 읽는 slider 현재값이다. */
	upperSectionRatio: number;
	isResizing: boolean;
}

export default function ResizeHandle({
	upperSectionRatio,
	isResizing,
	...props
}: ResizeHandleProps) {
	return (
		<div
			role="slider"
			aria-label="Resize panels"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(upperSectionRatio)}
			tabIndex={0}
			className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center hover:bg-muted/50 transition-colors"
			{...props}
		>
			<GripHorizontal
				className={cn(
					"h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors",
					props.className,
					isResizing && "text-muted-foreground",
				)}
			/>
		</div>
	);
}
