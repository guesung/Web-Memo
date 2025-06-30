"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Badge, Button, CardFooter, ToastAction, toast } from "@web-memo/ui";
import dayjs from "dayjs";
import { FolderIcon, HeartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent, PropsWithChildren } from "react";

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
			className={cn("flex justify-between p-0 px-4 pb-2 pt-0", props.className)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-2">
				{memo.category?.name ? (
					<Badge
						variant="outline"
						onClick={handleCategoryClick}
						className="z-10 flex items-center gap-1"
						style={{
							backgroundColor: memo.category.color
								? `${memo.category.color}20`
								: "bg-muted/50",
							borderColor: memo.category.color || undefined,
							color: memo.category.color || undefined,
						}}
					>
						<FolderIcon size={12} />
						{memo.category?.name}
					</Badge>
				) : null}
			</div>
			<div
				className={cn("relative z-50 flex items-center transition", {
					"opacity-0": !isShowingOption,
				})}
			>
				<Button variant="ghost" size="icon" onClick={handleIsWishClick}>
					<HeartIcon
						size={12}
						fill={memo.isWish ? "pink" : ""}
						fillOpacity={memo.isWish ? 100 : 0}
						className={cn(
							"transition-transform hover:scale-110 active:scale-95",
							{
								"animate-heart-pop": memo.isWish,
							},
						)}
					/>
				</Button>
				<MemoOption memoIds={[memo.id]} lng={lng} />
				{children}
			</div>
			<time
				dateTime={memo.updated_at ?? ""}
				className={cn("text-muted-foreground absolute right-4 text-xs", {
					"opacity-0": isShowingOption,
				})}
			>
				{dayjs(memo.updated_at).fromNow()}
			</time>
		</CardFooter>
	);
}
