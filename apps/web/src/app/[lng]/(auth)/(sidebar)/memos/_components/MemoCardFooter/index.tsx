"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Badge, badgeVariants, CardFooter } from "@web-memo/ui";
import dayjs from "dayjs";
import { Clock, FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import CategoryPopover from "./CategoryPopover";
import MemoOption from "./MemoOption";
import MemoStatusToggles from "./MemoStatusToggles";
import useMemoCategoryPopover, {
	type TMemoCategoryPopover,
} from "./useMemoCategoryPopover";

/** 메모 카드 푸터의 상태와 표시 속성. */
interface IFMemoCardFooterProps
	extends LanguageType,
		React.HTMLAttributes<HTMLDivElement> {
	memo: GetMemoResponse;
	isShowingOption?: boolean;
	/** 카테고리 배지를 누르면 할 일. 카드는 목록 필터, 편집 모달은 카테고리 팝업 */
	categoryBadgeAction?: "filter" | "popup";
	/**
	 * 바깥에서 만든 카테고리 팝업. 편집 모달은 본문 #도 같은 팝업을 열어야 해서 모달이 갖고 넘긴다.
	 * 없으면 푸터가 직접 만든다.
	 */
	categoryPopover?: TMemoCategoryPopover;
	highlightCount?: number;
}

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
	categoryBadgeAction = "filter",
	categoryPopover,
	highlightCount,
	...props
}: IFMemoCardFooterProps & { categoryPopover: TMemoCategoryPopover }) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleCategoryFilterClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
		if (!memo.category?.name) return;

		searchParams.set("category", memo.category?.name);
		router.push(searchParams.getUrl(), { scroll: false });
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

export default MemoCardFooter;
