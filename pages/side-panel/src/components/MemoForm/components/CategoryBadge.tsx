import type { CategoryRow } from "@web-memo/shared/types";
import { Badge } from "@web-memo/ui";
import { XIcon } from "lucide-react";

interface CategoryBadgeProps {
	category: CategoryRow;
	onRemove: () => void;
}

export default function CategoryBadge({
	category,
	onRemove,
}: CategoryBadgeProps) {
	return (
		<Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5">
			<div
				className="h-2 w-2 rounded-full"
				style={{
					backgroundColor: category.color || "#888888",
				}}
			/>
			{category.name}
			<XIcon
				size={12}
				className="hover:text-destructive ml-1 cursor-pointer"
				onClick={onRemove}
			/>
		</Badge>
	);
}
