"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn, type TPlanDateKey } from "@web-memo/shared/utils";
import { Badge, Button, CardFooter, ToastAction, toast } from "@web-memo/ui";
import dayjs from "dayjs";
import { BookOpen, FolderIcon, HeartIcon, StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import MemoOption from "./MemoOption";
import PlanDateChip from "./PlanDateChip";
import PlanDatePopover from "./PlanDatePopover";
import usePlanDateChange from "./usePlanDateChange";

/** 메모 카드 푸터의 상태와 표시 속성. */
interface IFMemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement> {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
	highlightCount?: number;
	/** 꺼진 상태 버튼을 평소에 숨기고 마우스를 올렸을 때만 보인다. 목록 카드가 켠다 */
	hidesInactiveActions?: boolean;
}

/**
 * 꺼진 상태 버튼을 평소에 숨기는 클래스. 호버할 수 있는 기기에서만 숨긴다.
 * @description 터치 화면에는 호버가 없어, 숨기면 카드에서 누를 길이 사라진다.
 */
const HIDDEN_UNTIL_HOVER = "[@media(hover:hover)]:hidden";

/** 메모 카테고리, 수정 시각과 상태 변경 버튼을 표시한다. */
function MemoCardFooter({
	memo,
	lng,
	children,
	isShowingOption = true,
	highlightCount,
	hidesInactiveActions = false,
	...props
}: IFMemoCardFooterProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isPlanPickerOpen, setIsPlanPickerOpen] = useState(false);
	const changePlanDate = usePlanDateChange({ memo, lng });
	const isActionsExpanded =
		isShowingOption || isDropdownOpen || isPlanPickerOpen;
	const hiddenUntilHover = (isActive: boolean) =>
		hidesInactiveActions &&
		!isActionsExpanded &&
		!isActive &&
		HIDDEN_UNTIL_HOVER;

	const handleCategoryClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
		if (!memo.category?.name) return;

		searchParams.set("category", memo.category?.name);
		router.push(searchParams.getUrl(), { scroll: false });
	};

	const handlePlanDateSelect = (plannedDate: TPlanDateKey | null) => {
		setIsPlanPickerOpen(false);
		changePlanDate(plannedDate);
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
		<CardFooter
			{...props}
			className={cn(
				"flex items-center justify-between px-5 py-3 border-t border-border",
				props.className,
			)}
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
				{/* 호버로 아이콘이 늘어나도 카드 높이가 변하지 않게, 넘치는 뒷부분은 말줄임으로 자른다. */}
				<div className="flex min-w-0 items-center gap-x-1.5 whitespace-nowrap text-xs text-muted-foreground">
					<time dateTime={memo.updated_at ?? ""} className="shrink-0">
						{dayjs(memo.updated_at).fromNow()}
					</time>
					{memo.plannedDate && (
						<>
							<MetaSeparator />
							<PlanDateChip
								lng={lng}
								plannedDate={memo.plannedDate}
								onClick={() => setIsPlanPickerOpen(true)}
							/>
						</>
					)}
					{highlightCount !== undefined && highlightCount > 0 ? (
						<>
							<MetaSeparator />
							<span className="min-w-0 truncate font-medium text-primary">
								{t("memoSection.highlightCount", { count: highlightCount })}
							</span>
						</>
					) : null}
				</div>
			</div>

			<div
				className={cn("flex items-center gap-1 transition-opacity", {
					"opacity-40 hover:opacity-100":
						!hidesInactiveActions && !isActionsExpanded,
				})}
			>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-full",
						hiddenUntilHover(Boolean(memo.isWish)),
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
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full",
						hiddenUntilHover(Boolean(memo.isReading)),
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
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-8 h-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full",
						hiddenUntilHover(Boolean(memo.isStar)),
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
				<PlanDatePopover
					memo={memo}
					lng={lng}
					open={isPlanPickerOpen}
					onOpenChange={setIsPlanPickerOpen}
					onSelect={handlePlanDateSelect}
					// 날짜가 있으면 왼쪽 문구로 이미 보이므로, 켜진 상태여도 평소엔 숨긴다.
					triggerClassName={cn(hiddenUntilHover(false))}
				/>
				<span
					className={cn("transition-opacity", {
						"opacity-40": hidesInactiveActions && !isActionsExpanded,
					})}
				>
					<MemoOption
						memos={[memo]}
						lng={lng}
						onOpenChange={setIsDropdownOpen}
					/>
				</span>
				{children}
			</div>
		</CardFooter>
	);
}

/** 푸터 한 줄 정보 사이의 구분점. 읽기 보조 기기에는 읽히지 않게 한다. */
function MetaSeparator() {
	return (
		<span aria-hidden="true" className="shrink-0">
			·
		</span>
	);
}

export default MemoCardFooter;
