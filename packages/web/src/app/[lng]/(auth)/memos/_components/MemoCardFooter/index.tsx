"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Badge, Button, CardFooter, ToastAction, toast } from "@web-memo/ui";
import dayjs from "dayjs";
import { Clock, FolderIcon, HeartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent, PropsWithChildren } from "react";
import { useState } from "react";

import MemoOption from "./MemoOption";

interface MemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement>,
		PropsWithChildren {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
}

export default function MemoCardFooter({
	memo,
	lng,
	children,
	isShowingOption = true,
	...props
}: MemoCardFooterProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleCategoryClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
		if (!memo.category?.name) return;

		searchParams.set("category", memo.category?.name);
		router.push(searchParams.getUrl(), { scroll: false });
	};

	const handleIsWishClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		mutateMemoPatch({
			id: memo.id,
			request: {
				isWish: !memo.isWish,
			},
		});

		const toastTitle = memo.isWish
			? t("toastTitle.memoWishListDeleted")
			: t("toastTitle.memoWishListAdded");

		toast({
			title: toastTitle,
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						mutateMemoPatch({
							id: memo.id,
							request: {
								isWish: memo.isWish,
							},
						});
					}}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});
	};

	return (
		<CardFooter
			className={cn(
				"flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800",
				props.className,
			)}
			{...props}
		>
			<div className="flex flex-col gap-2 flex-1 min-w-0">
				{memo.category?.name && (
					<Badge
						variant="outline"
						onClick={handleCategoryClick}
						className={cn(
							"inline-flex items-center gap-1.5 w-fit",
							"px-2.5 py-1 rounded-full",
							"text-xs font-semibold",
							"cursor-pointer",
							"transition-all duration-200",
							"hover:scale-105 hover:shadow-md",
						)}
						style={{
							backgroundColor: memo.category.color
								? `${memo.category.color}15`
								: undefined,
							borderColor: memo.category.color || undefined,
							color: memo.category.color || undefined,
						}}
					>
						<FolderIcon size={12} />
						<span>{memo.category.name}</span>
					</Badge>
				)}
				<time
					dateTime={memo.updated_at ?? ""}
					className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"
				>
					<Clock className="w-3 h-3" />
					{dayjs(memo.updated_at).fromNow()}
				</time>
			</div>

			<div
				className={cn("flex items-center gap-1 transition-opacity", {
					"opacity-100": isShowingOption || isDropdownOpen,
					"opacity-40 hover:opacity-100": !isShowingOption && !isDropdownOpen,
				})}
			>
				<Button
					variant="ghost"
					size="sm"
					className="w-8 h-8 p-0 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-full"
					onClick={handleIsWishClick}
				>
					<HeartIcon
						size={16}
						fill={memo.isWish ? "#ec4899" : "none"}
						className={cn(
							"transition-all",
							memo.isWish ? "text-pink-500 scale-110" : "text-gray-400",
							"hover:scale-125",
						)}
					/>
				</Button>
				<MemoOption
					memos={[memo]}
					lng={lng}
					onOpenChange={setIsDropdownOpen}
				/>
				{children}
			</div>
		</CardFooter>
	);
}
