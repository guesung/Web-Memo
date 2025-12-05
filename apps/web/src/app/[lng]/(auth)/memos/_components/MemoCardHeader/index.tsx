import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import {
	Button,
	CardHeader,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import { CheckIcon, ExternalLink, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import { memo, useCallback } from "react";

interface MemoCardHeaderProps {
	memo: GetMemoResponse;
	selectMemoItem?: (id: number) => void;
	isMemoHovering?: boolean;
	isMemoSelected?: boolean;
}

export default memo(function MemoCardHeader({
	memo,
	selectMemoItem,
	isMemoHovering = false,
	isMemoSelected,
}: MemoCardHeaderProps) {
	const handleCheckButtonClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();

			selectMemoItem?.(memo.id);
		},
		[selectMemoItem, memo.id],
	);

	const isShowingSelectButton = isMemoHovering || isMemoSelected;
	return (
		<CardHeader className="relative px-5 py-4 border-b border-gray-100 dark:border-gray-800">
			<Button
				variant="outline"
				size="sm"
				className={cn(
					"absolute -left-3 -top-3 z-20",
					"w-7 h-7 p-0 rounded-full",
					"bg-white dark:bg-gray-900",
					"border-2 border-gray-300 dark:border-gray-700",
					"shadow-md hover:shadow-lg",
					"transition-all duration-200",
					{
						"opacity-100 scale-100": isShowingSelectButton,
						"opacity-0 scale-75 pointer-events-none": !isShowingSelectButton,
						"bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:text-white":
							isMemoSelected,
					},
				)}
				onClick={handleCheckButtonClick}
			>
				<CheckIcon
					size={12}
					className={cn("transition-all", { "scale-110": isMemoSelected })}
				/>
			</Button>

			<Link
				href={memo.url}
				target="_blank"
				className="group/link flex items-center gap-2.5 hover:translate-x-0.5 transition-transform"
				onClick={(e) => e.stopPropagation()}
			>
				{memo?.favIconUrl ? (
					<div className="flex-shrink-0 w-5 h-5 rounded overflow-hidden">
						<Image
							src={memo.favIconUrl}
							width={20}
							height={20}
							alt="favicon"
							className="w-full h-full object-contain"
							priority
						/>
					</div>
				) : (
					<Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
				)}
				<TooltipProvider delayDuration={200}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="line-clamp-1 font-bold text-gray-900 dark:text-white group-hover/link:text-purple-600 dark:group-hover/link:text-purple-400 transition-colors">
								{memo.title}
							</span>
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p className="text-sm">{memo.title}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
			</Link>
		</CardHeader>
	);
});
