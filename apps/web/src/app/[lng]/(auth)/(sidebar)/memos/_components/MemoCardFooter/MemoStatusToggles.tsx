import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Button, IconTooltip, ToastAction, toast } from "@web-memo/ui";
import { BookOpen, HeartIcon, StarIcon } from "lucide-react";
import type { MouseEvent } from "react";

/** 메모 카드 푸터 상태 토글의 props. */
interface IFMemoStatusTogglesProps extends LanguageType {
	memo: GetMemoResponse;
	/** 버튼마다 덧붙일 클래스. 켜진 상태인지를 받아 꺼진 버튼만 숨길 때 쓴다 */
	buttonClassName?: (isActive: boolean) => string;
}

/**
 * 위시·읽는 중·중요 토글 버튼 세 개
 * @description 누르면 저장하고 되돌리기 토스트를 띄운다. 사용처: MemoCardFooter/index.tsx
 */
export default function MemoStatusToggles({
	memo,
	lng,
	buttonClassName,
}: IFMemoStatusTogglesProps) {
	const { t } = useTranslation(lng);
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();

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
						analytics.trackEvent({
							name: "memo_undo",
							params: { action: "wish" },
						});
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

	const handleIsReadingClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		mutateMemoPatch({
			id: memo.id,
			request: {
				isReading: !memo.isReading,
			},
		});

		const toastTitle = memo.isReading
			? t("toastTitle.memoReadingDeleted")
			: t("toastTitle.memoReadingAdded");

		toast({
			title: toastTitle,
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						analytics.trackEvent({
							name: "memo_undo",
							params: { action: "reading" },
						});
						mutateMemoPatch({
							id: memo.id,
							request: {
								isReading: memo.isReading,
							},
						});
					}}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});
	};

	const handleIsStarClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		mutateMemoPatch({
			id: memo.id,
			request: {
				isStar: !memo.isStar,
			},
		});

		const toastTitle = memo.isStar
			? t("toastTitle.memoStarDeleted")
			: t("toastTitle.memoStarAdded");

		toast({
			title: toastTitle,
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						mutateMemoPatch({
							id: memo.id,
							request: {
								isStar: memo.isStar,
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
		<>
			<IconTooltip
				label={t(
					memo.isWish ? "memos.tooltip.wishRemove" : "memos.tooltip.wishAdd",
				)}
			>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-full",
						buttonClassName?.(Boolean(memo.isWish)),
					)}
					aria-label={t("memos.toggle.wish")}
					aria-pressed={Boolean(memo.isWish)}
					onClick={handleIsWishClick}
				>
					<HeartIcon
						size={16}
						fill={memo.isWish ? "currentColor" : "none"}
						className={cn(
							"transition-all",
							memo.isWish ? "text-pink-500 scale-110" : "text-muted-foreground",
							"hover:scale-125",
						)}
					/>
				</Button>
			</IconTooltip>
			<IconTooltip
				label={t(
					memo.isReading
						? "memos.tooltip.readingRemove"
						: "memos.tooltip.readingAdd",
				)}
			>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full",
						buttonClassName?.(Boolean(memo.isReading)),
					)}
					aria-label={t("memos.toggle.reading")}
					aria-pressed={Boolean(memo.isReading)}
					onClick={handleIsReadingClick}
				>
					<BookOpen
						size={16}
						className={cn(
							"transition-all",
							memo.isReading
								? "text-emerald-500 scale-110"
								: "text-muted-foreground",
							"hover:scale-125",
						)}
					/>
				</Button>
			</IconTooltip>
			<IconTooltip
				label={t(
					memo.isStar ? "memos.tooltip.starRemove" : "memos.tooltip.starAdd",
				)}
			>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full",
						buttonClassName?.(Boolean(memo.isStar)),
					)}
					aria-label={t("memos.toggle.star")}
					aria-pressed={Boolean(memo.isStar)}
					onClick={handleIsStarClick}
				>
					<StarIcon
						size={16}
						fill={memo.isStar ? "currentColor" : "none"}
						className={cn(
							"transition-all",
							memo.isStar
								? "text-amber-500 scale-110"
								: "text-muted-foreground",
							"hover:scale-125",
						)}
					/>
				</Button>
			</IconTooltip>
		</>
	);
}
