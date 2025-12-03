import { GripHorizontal } from "lucide-react";

export default function ResizeHandle({
	summaryHeight,
	isResizing,
	onMouseDown,
}: ResizeHandleProps) {
	return (
		<div
			role="slider"
			aria-label="Resize panels"
			aria-valuemin={20}
			aria-valuemax={80}
			aria-valuenow={Math.round(summaryHeight)}
			tabIndex={0}
			className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center hover:bg-muted/50 transition-colors"
			onMouseDown={onMouseDown}
		>
			<GripHorizontal
				className={`h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors ${isResizing ? "text-muted-foreground" : ""}`}
			/>
		</div>
	);
}

interface ResizeHandleProps {
	summaryHeight: number;
	isResizing: boolean;
	onMouseDown: (e: React.MouseEvent) => void;
}
