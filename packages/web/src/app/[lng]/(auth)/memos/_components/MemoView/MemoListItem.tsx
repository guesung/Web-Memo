import type { LanguageType } from "@src/modules/i18n";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import {
	Badge,
	Checkbox,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { FolderIcon, Globe, HeartIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import { memo } from "react";

import MemoHoverPreview from "./MemoHoverPreview";

interface MemoListItemProps extends LanguageType {
	memo: GetMemoResponse;
	isSelectingMode: boolean;
	selectMemoItem: (id: number) => void;
	isMemoSelected: boolean;
	className?: string;
}

export default memo(function MemoListItem({
	lng,
	memo,
	selectMemoItem,
	isSelectingMode,
	isMemoSelected,
	className,
}: MemoListItemProps) {
	const searchParams = useSearchParams();

	const handleMemoItemClick = (event: MouseEvent<HTMLElement>) => {
		const target = event.target as HTMLElement;
		if (
			target.closest("a") ||
			target.closest("button") ||
			target.closest('[role="checkbox"]')
		) {
			return;
		}

		if (isSelectingMode) {
			selectMemoItem(memo.id);
		} else {
			searchParams.set("id", String(memo.id));
			history.pushState({ openedMemoId: memo.id }, "", searchParams.getUrl());
		}
	};

	const handleCheckboxClick = (event: MouseEvent) => {
		event.stopPropagation();
		selectMemoItem(memo.id);
	};

	const getDomainFromUrl = (url: string) => {
		try {
			return new URL(url).hostname.replace("www.", "");
		} catch {
			return url;
		}
	};

	return (
		<MemoHoverPreview lng={lng} memo={memo} enabled={!isSelectingMode}>
			<motion.div
				id={String(memo.id)}
				className={cn(
					"memo-item group flex items-center gap-3 px-4 py-3 rounded-lg border bg-card transition-all cursor-pointer select-none",
					"hover:bg-accent/50 hover:border-accent",
					{
						"border-primary bg-primary/5 ring-1 ring-primary/20":
							isMemoSelected,
					},
					className,
				)}
				onClick={handleMemoItemClick}
				initial={{ opacity: 0, y: 4 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0 }}
				tabIndex={0}
				role="button"
				aria-label={`메모 ${memo.id}`}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleMemoItemClick(e as unknown as MouseEvent<HTMLElement>);
					}
				}}
				style={{
					borderLeftColor: memo.category?.color || undefined,
					borderLeftWidth: memo.category?.color ? "3px" : undefined,
				}}
			>
				<div
					className={cn(
						"shrink-0 transition-opacity",
						isSelectingMode || isMemoSelected
							? "opacity-100"
							: "opacity-0 group-hover:opacity-100",
					)}
					onClick={handleCheckboxClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleCheckboxClick(e as unknown as MouseEvent);
						}
					}}
				>
					<Checkbox checked={isMemoSelected} aria-label="메모 선택" />
				</div>

				<div className="shrink-0">
					{memo?.favIconUrl ? (
						<Image
							src={memo.favIconUrl}
							width={16}
							height={16}
							alt="favicon"
							className="h-4 w-4 object-contain rounded"
							priority
						/>
					) : (
						<Globe className="h-4 w-4 text-muted-foreground" />
					)}
				</div>

				<div className="flex-1 min-w-0 flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<TooltipProvider delayDuration={200}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Link
										href={memo.url}
										target="_blank"
										className="font-medium text-sm truncate hover:underline"
										onClick={(e) => e.stopPropagation()}
									>
										{memo.title}
									</Link>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p className="max-w-xs">{memo.title}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					{memo.memo && (
						<p className="text-xs text-muted-foreground truncate">
							{memo.memo}
						</p>
					)}
				</div>

				<div className="shrink-0 flex items-center gap-2">
					{memo.category?.name && (
						<Badge
							variant="outline"
							className="text-xs px-2 py-0.5 flex items-center gap-1"
							style={{
								backgroundColor: memo.category.color
									? `${memo.category.color}15`
									: undefined,
								borderColor: memo.category.color || undefined,
								color: memo.category.color || undefined,
							}}
						>
							<FolderIcon className="h-2.5 w-2.5" />
							{memo.category.name}
						</Badge>
					)}

					<span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
						{getDomainFromUrl(memo.url)}
					</span>

					<time
						dateTime={memo.updated_at ?? ""}
						className="text-xs text-muted-foreground whitespace-nowrap"
					>
						{dayjs(memo.updated_at).fromNow()}
					</time>

					{memo.isWish && (
						<HeartIcon
							className="h-3.5 w-3.5 text-pink-500"
							fill="currentColor"
						/>
					)}
				</div>
			</motion.div>
		</MemoHoverPreview>
	);
});
