"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Badge, CardFooter } from "@web-memo/ui";
import dayjs from "dayjs";
import { Clock, FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useRef, useState } from "react";
import CategoryAddChip from "./CategoryAddChip";
import CategoryPopover from "./CategoryPopover";
import MemoOption from "./MemoOption";
import MemoStatusToggles from "./MemoStatusToggles";
import useMemoCategoryPopover from "./useMemoCategoryPopover";

/** 메모 카드 푸터의 상태와 표시 속성. */
interface IFMemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement> {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
	/** 선택 모드. 카테고리 추가 칩을 눌러도 팝업 대신 카드 선택으로 처리한다 */
	isSelectingMode?: boolean;
	/** 카테고리가 없을 때 추가 칩을 보여줄지. 편집 모달은 숨긴다 */
	hasCategoryAddChip?: boolean;
	highlightCount?: number;
}

/** 메모 카테고리, 수정 시각과 상태 변경 버튼을 표시한다. */
function MemoCardFooter({
	memo,
	lng,
	children,
	isShowingOption = true,
	isSelectingMode = false,
	hasCategoryAddChip = true,
	highlightCount,
	...props
}: IFMemoCardFooterProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const categoryAddChipRef = useRef<HTMLButtonElement>(null);
	const categoryPopover = useMemoCategoryPopover({
		lng,
		memo,
		chipRef: categoryAddChipRef,
	});

	const handleCategoryClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
		if (!memo.category?.name) return;

		searchParams.set("category", memo.category?.name);
		router.push(searchParams.getUrl(), { scroll: false });
	};

	const handleCategoryAddChipClick = (event: MouseEvent<HTMLButtonElement>) => {
		// 선택 모드에서는 카드 클릭으로 흘려보내 카드 선택을 바꾼다.
		if (isSelectingMode) return;

		event.stopPropagation();
		categoryPopover.open(event.currentTarget);
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
				{!memo.category?.name && hasCategoryAddChip && (
					<CategoryAddChip
						lng={lng}
						chipRef={categoryAddChipRef}
						onClick={handleCategoryAddChipClick}
					/>
				)}
				<time
					dateTime={memo.updated_at ?? ""}
					className="text-xs text-muted-foreground flex items-center gap-1.5"
				>
					<Clock className="w-3 h-3" />
					{dayjs(memo.updated_at).fromNow()}
				</time>
				{highlightCount !== undefined && highlightCount > 0 ? (
					<span className="text-xs font-medium text-primary">
						{t("memoSection.highlightCount", { count: highlightCount })}
					</span>
				) : null}
			</div>

			<div
				className={cn("flex items-center gap-1 transition-opacity", {
					"opacity-100": isShowingOption || isDropdownOpen,
					"opacity-40 hover:opacity-100": !isShowingOption && !isDropdownOpen,
				})}
			>
				<MemoStatusToggles memo={memo} lng={lng} />
				<MemoOption
					memos={[memo]}
					lng={lng}
					onOpenChange={setIsDropdownOpen}
					onCategoryPopupOpen={categoryPopover.open}
				/>
				{children}
			</div>
			<CategoryPopover
				lng={lng}
				isOpen={categoryPopover.isOpen}
				anchorElement={categoryPopover.anchorElement}
				categories={categoryPopover.categories}
				currentCategoryId={categoryPopover.currentCategoryId}
				isCategoryCreating={categoryPopover.isCategoryCreating}
				onOpenChange={categoryPopover.handleOpenChange}
				onCategorySelect={categoryPopover.handleCategorySelect}
				onCategoryCreate={categoryPopover.handleCategoryCreate}
				onCategoryRemove={categoryPopover.handleCategoryRemove}
				onCloseAutoFocus={categoryPopover.handleCloseAutoFocus}
			/>
		</CardFooter>
	);
}

export default MemoCardFooter;
