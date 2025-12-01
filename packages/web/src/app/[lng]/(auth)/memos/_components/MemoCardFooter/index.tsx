"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Badge, Button, CardFooter, ToastAction, toast } from "@web-memo/ui";
import dayjs from "dayjs";
import { FolderIcon, HeartIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, PropsWithChildren } from "react";
import { memo, useCallback, useState } from "react";

import MemoOption from "./MemoOption";

interface MemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement>,
		PropsWithChildren {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
}

export default memo(function MemoCardFooter({
	memo: memoData,
	lng,
	children,
	isShowingOption = true,
	...props
}: MemoCardFooterProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const searchParams = useSearchParams();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleCategoryClick = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			event.stopPropagation();
			if (!memoData.category?.name) return;

			const params = new URLSearchParams(searchParams.toString());
			params.set("category", memoData.category.name);
			router.push(`?${params.toString()}`, { scroll: false });
		},
		[memoData.category?.name, router, searchParams],
	);

	const handleIsWishClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();

			mutateMemoPatch({
				id: memoData.id,
				request: {
					isWish: !memoData.isWish,
				},
			});

			const toastTitle = memoData.isWish
				? t("toastTitle.memoWishListDeleted")
				: t("toastTitle.memoWishListAdded");

			toast({
				title: toastTitle,
				action: (
					<ToastAction
						altText={t("toastActionMessage.undo")}
						onClick={() => {
							mutateMemoPatch({
								id: memoData.id,
								request: {
									isWish: memoData.isWish,
								},
							});
						}}
					>
						{t("toastActionMessage.undo")}
					</ToastAction>
				),
			});
		},
		[memoData.id, memoData.isWish, mutateMemoPatch, t],
	);

	const handleDropdownOpenChange = useCallback((open: boolean) => {
		setIsDropdownOpen(open);
	}, []);

	return (
		<CardFooter
			className={cn("flex justify-between p-0 px-4 pb-2 pt-0", props.className)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-2">
				{memoData.category?.name ? (
					<Badge
						variant="outline"
						onClick={handleCategoryClick}
						className="z-10 flex items-center gap-1"
						style={{
							backgroundColor: memoData.category.color
								? `${memoData.category.color}20`
								: "bg-muted/50",
							borderColor: memoData.category.color || undefined,
							color: memoData.category.color || undefined,
						}}
					>
						<FolderIcon size={12} />
						{memoData.category?.name}
					</Badge>
				) : null}
			</div>
			<div className="h-[36px] flex items-center">
				{isShowingOption || isDropdownOpen ? (
					<div className="relative z-50 flex items-center transition">
						<Button variant="ghost" size="icon" onClick={handleIsWishClick}>
							<HeartIcon
								size={12}
								fill={memoData.isWish ? "pink" : ""}
								fillOpacity={memoData.isWish ? 100 : 0}
								className={cn(
									"transition-transform hover:scale-110 active:scale-95",
									{
										"animate-heart-pop": memoData.isWish,
									},
								)}
							/>
						</Button>
						<MemoOption
							memoIds={[memoData.id]}
							lng={lng}
							onOpenChange={handleDropdownOpenChange}
						/>
						{children}
					</div>
				) : (
					<time
						dateTime={memoData.updated_at ?? ""}
						className="text-muted-foreground absolute right-4 text-xs"
					>
						{dayjs(memoData.updated_at).fromNow()}
					</time>
				)}
			</div>
		</CardFooter>
	);
});
