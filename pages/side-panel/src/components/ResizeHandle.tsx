import { cn } from "@web-memo/ui";
import { GripHorizontal } from "lucide-react";

interface ResizeHandleProps extends React.ComponentProps<"div"> {
	tabHeight: number;
	isResizing: boolean;
}

export default function ResizeHandle({
	tabHeight,
	isResizing,
	...props
}: ResizeHandleProps) {
	return (
		<div
			role="slider"
			aria-label="Resize panels"
			aria-valuemin={20}
			aria-valuemax={80}
			aria-valuenow={Math.round(tabHeight)}
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
