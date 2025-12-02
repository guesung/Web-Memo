"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDeleteMemosMutation,
	useMemoPatchMutation,
} from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import {
	Button,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	toast,
} from "@web-memo/ui";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ExternalLink, Heart, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { memo } from "react";

dayjs.extend(relativeTime);

interface MemoHoverPreviewProps extends LanguageType {
	memo: GetMemoResponse;
	children: ReactNode;
	enabled?: boolean;
}

export default memo(function MemoHoverPreview({
	lng,
	memo: memoData,
	children,
	enabled = true,
}: MemoHoverPreviewProps) {
	const { t } = useTranslation(lng);
	const { mutate: deleteMemos } = useDeleteMemosMutation();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		deleteMemos([memoData.id], {
			onSuccess: () => {
				toast({ title: t("toastTitle.memoDeleted") });
			},
		});
	};

	const handleToggleWishlist = (e: React.MouseEvent) => {
		e.stopPropagation();
		mutateMemoPatch({
			id: memoData.id,
			request: { isWish: !memoData.isWish },
		});
		toast({
			title: memoData.isWish
				? t("toastTitle.memoWishListDeleted")
				: t("toastTitle.memoWishListAdded"),
		});
	};

	const handleOpenLink = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (memoData.url) {
			window.open(memoData.url, "_blank");
		}
	};

	if (!enabled) {
		return <>{children}</>;
	}

	return (
		<HoverCard openDelay={700} closeDelay={100}>
			<HoverCardTrigger asChild>{children}</HoverCardTrigger>
			<HoverCardContent
				className="w-80 p-0"
				side="right"
				align="start"
				sideOffset={8}
			>
				<div className="p-4 space-y-3">
					{memoData.title && (
						<div className="font-medium text-sm line-clamp-2">
							{memoData.title}
						</div>
					)}

					{memoData.memo && (
						<p className="text-sm text-muted-foreground whitespace-break-spaces break-all line-clamp-6">
							{memoData.memo}
						</p>
					)}

					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						{memoData.category && (
							<span
								className="px-2 py-0.5 rounded-full text-xs"
								style={{
									backgroundColor: memoData.category.color
										? `${memoData.category.color}20`
										: undefined,
									color: memoData.category.color || undefined,
								}}
							>
								{memoData.category.name}
							</span>
						)}
						<span>{dayjs(memoData.updated_at).fromNow()}</span>
					</div>
				</div>

				<div className="border-t px-2 py-2 flex items-center justify-between bg-muted/30">
					<div className="flex items-center gap-1">
						<Button
							size="icon"
							variant="ghost"
							className="h-8 w-8"
							onClick={handleToggleWishlist}
						>
							<Heart
								className={cn("h-4 w-4", {
									"fill-pink-500 text-pink-500": memoData.isWish,
								})}
							/>
						</Button>
						{memoData.url && (
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								onClick={handleOpenLink}
							>
								<ExternalLink className="h-4 w-4" />
							</Button>
						)}
					</div>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 text-destructive hover:text-destructive"
						onClick={handleDelete}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
});
