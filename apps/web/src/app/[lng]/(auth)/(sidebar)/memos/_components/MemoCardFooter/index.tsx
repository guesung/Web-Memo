"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn, type TPlanDateKey } from "@web-memo/shared/utils";
import { Badge, badgeVariants, CardFooter } from "@web-memo/ui";
import dayjs from "dayjs";
import { FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import CategoryPopover from "./CategoryPopover";
import MemoOption from "./MemoOption";
import MemoStatusToggles from "./MemoStatusToggles";
import PlanDateChip from "./PlanDateChip";
import PlanDatePopover from "./PlanDatePopover";
import useMemoCategoryPopover, {
	type TMemoCategoryPopover,
} from "./useMemoCategoryPopover";
import usePlanDateChange from "./usePlanDateChange";

/** 메모 카드 푸터의 상태와 표시 속성. */
interface IFMemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement> {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
	onDeleteSuccess?: () => void;
	/** 카테고리 배지를 누르면 할 일. 카드는 목록 필터, 편집 모달은 카테고리 팝업 */
	categoryBadgeAction?: "filter" | "popup";
	/**
	 * 바깥에서 만든 카테고리 팝업. 편집 모달은 본문 #도 같은 팝업을 열어야 해서 모달이 갖고 넘긴다.
	 * 없으면 푸터가 직접 만든다.
	 */
	categoryPopover?: TMemoCategoryPopover;
	highlightCount?: number;
	/** 수정 시각 오른쪽에 붙일 요소. 편집 모달은 저장 상태 아이콘을 둔다 */
	timeAccessory?: React.ReactNode;
	/** 꺼진 상태 버튼을 평소에 숨기고 마우스를 올렸을 때만 보인다. 목록 카드가 켠다 */
	hidesInactiveActions?: boolean;
	/**
	 * 수정 시각을 날짜로 보인다(상대 시각은 툴팁). 메모 상세 다이얼로그가 켠다
	 * @description "4달 전"만으로는 언제 쓴 메모인지 알기 어렵다.
	 */
	showsAbsoluteTime?: boolean;
	/** 켜진 상태 토글에 이름을 함께 보인다. 메모 상세 다이얼로그가 켠다 */
	labelsActiveToggles?: boolean;
}

/**
 * 꺼진 상태 버튼을 평소에 숨기는 클래스. 호버할 수 있는 기기에서만 숨긴다.
 * @description 터치 화면에는 호버가 없어, 숨기면 카드에서 누를 길이 사라진다.
 */
const HIDDEN_UNTIL_HOVER = "[@media(hover:hover)]:hidden";

/** 메모 카테고리, 수정 시각과 상태 변경 버튼을 표시한다. */
function MemoCardFooter(props: IFMemoCardFooterProps) {
	if (props.categoryPopover) {
		return (
			<MemoCardFooterContent
				{...props}
				categoryPopover={props.categoryPopover}
			/>
		);
	}

	return <MemoCardFooterWithPopover {...props} />;
}

/** 카테고리 팝업을 푸터가 직접 갖는 경우(메모 카드). */
function MemoCardFooterWithPopover(props: IFMemoCardFooterProps) {
	const categoryPopover = useMemoCategoryPopover({
		lng: props.lng,
		memo: props.memo,
	});

	return (
		<>
			<MemoCardFooterContent {...props} categoryPopover={categoryPopover} />
			<CategoryPopover lng={props.lng} popover={categoryPopover} />
		</>
	);
}

function MemoCardFooterContent({
	memo,
	lng,
	children,
	isShowingOption = true,
	onDeleteSuccess,
	categoryBadgeAction = "filter",
	categoryPopover,
	highlightCount,
	timeAccessory,
	hidesInactiveActions = false,
	showsAbsoluteTime = false,
	labelsActiveToggles = false,
	...props
}: IFMemoCardFooterProps & { categoryPopover: TMemoCategoryPopover }) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isPlanPickerOpen, setIsPlanPickerOpen] = useState(false);
	const changePlanDate = usePlanDateChange({ memo, lng });
	const isActionsExpanded =
		isShowingOption ||
		isDropdownOpen ||
		isPlanPickerOpen ||
		categoryPopover.isOpen;
	const hiddenUntilHover = (isActive: boolean) =>
		hidesInactiveActions &&
		!isActionsExpanded &&
		!isActive &&
		HIDDEN_UNTIL_HOVER;

	const handleCategoryFilterClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
		if (!memo.category?.name) return;

		searchParams.set("category", memo.category?.name);
		router.push(searchParams.getUrl(), { scroll: false });
	};

	const handlePlanDateSelect = (plannedDate: TPlanDateKey | null) => {
		setIsPlanPickerOpen(false);
		changePlanDate(plannedDate);
	};

	const categoryBadgeStyle = {
		backgroundColor: memo.category?.color
			? `${memo.category.color}15`
			: undefined,
		borderColor: memo.category?.color || undefined,
		color: memo.category?.color || undefined,
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
				{memo.category?.name && categoryBadgeAction === "filter" && (
					<Badge
						variant="outline"
						onClick={handleCategoryFilterClick}
						className={cn(categoryBadgeClassName, "cursor-pointer")}
						style={categoryBadgeStyle}
					>
						<FolderIcon size={12} />
						<span>{memo.category.name}</span>
					</Badge>
				)}
				{memo.category?.name && categoryBadgeAction === "popup" && (
					<button
						type="button"
						data-testid="category-badge-button"
						onClick={(event) => categoryPopover.open(event.currentTarget)}
						className={cn(
							badgeVariants({ variant: "outline" }),
							categoryBadgeClassName,
						)}
						style={categoryBadgeStyle}
					>
						<FolderIcon size={12} aria-hidden="true" />
						<span>{memo.category.name}</span>
					</button>
				)}
				{/* 호버로 아이콘이 늘어나도 카드 높이가 변하지 않게, 넘치는 뒷부분은 말줄임으로 자른다. */}
				<div className="flex min-w-0 items-center gap-x-1.5 whitespace-nowrap text-xs text-muted-foreground">
					<time
						dateTime={memo.updated_at ?? ""}
						title={
							showsAbsoluteTime ? dayjs(memo.updated_at).fromNow() : undefined
						}
						className="shrink-0"
					>
						{showsAbsoluteTime
							? t("memos.dialog.updatedAt", {
									date: formatMemoDate(memo.updated_at, lng),
								})
							: dayjs(memo.updated_at).fromNow()}
					</time>
					{timeAccessory}
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
				<MemoStatusToggles
					memo={memo}
					lng={lng}
					hiddenUntilHover={hiddenUntilHover}
					labelsActive={labelsActiveToggles}
				/>
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
						onCategoryPopupOpen={categoryPopover.open}
						onDeleteSuccess={onDeleteSuccess}
					/>
				</span>
				{children}
			</div>
		</CardFooter>
	);
}

const categoryBadgeClassName = cn(
	"inline-flex items-center gap-1.5 w-fit",
	"px-2.5 py-1 rounded-full",
	"text-xs font-semibold",
	"transition-all duration-200",
	"hover:scale-105 hover:shadow-md",
);

/** 수정 날짜를 "6월 12일"처럼 보인다. 올해가 아니면 연도를 붙인다. */
function formatMemoDate(date: string | null, lng: string) {
	const target = dayjs(date);
	return new Intl.DateTimeFormat(lng, {
		year: target.year() === dayjs().year() ? undefined : "numeric",
		month: "long",
		day: "numeric",
	}).format(target.toDate());
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
