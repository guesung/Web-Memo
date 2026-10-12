import { DEFAULT_CATEGORY_COLOR } from "@web-memo/shared/constants";
import type { CategoryRow } from "@web-memo/shared/types";
import { BanIcon, CheckIcon, PlusIcon } from "lucide-react";
import { type ReactNode, type Ref, useState } from "react";

import { cn } from "../utils";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "./command";

/** 팝업 목록에 필요한 카테고리 필드 */
type TCategoryCommandItem = Pick<CategoryRow, "id" | "name" | "color">;

/** 팝업에 보이는 문구. 확장(I18n)과 웹(useTranslation)이 각자 번역해 넘긴다 */
interface IFCategoryCommandLabels {
	/** 검색창 placeholder */
	search: string;
	/** 검색 결과가 없을 때 */
	noResult: string;
	/** 카테고리가 하나도 없을 때 */
	empty: string;
	/** 검색어로 만들기 항목. 검색어를 받아 문구를 돌려준다 */
	createNamed: (categoryName: string) => string;
	/** 카테고리 해제 항목. `onRemove`를 넘길 때만 쓰인다 */
	remove?: string;
}

/** CategoryCommand 컴포넌트의 props */
interface IFCategoryCommandProps<TCategory extends TCategoryCommandItem> {
	/** 사용자의 카테고리 목록 */
	categories: TCategory[] | null | undefined;
	/** 메모에 지정된 카테고리 id. 해당 항목에 체크 표시를 한다 */
	currentCategoryId: number | null;
	labels: IFCategoryCommandLabels;
	/** 카테고리 항목 선택 */
	onCategorySelect: (category: TCategory) => void;
	/** 검색어로 새 카테고리 만들기 */
	onCategoryCreate: (categoryName: string) => void;
	/** 카테고리를 만드는 중. 두 번 눌러 중복으로 생기지 않게 만들기 항목을 막는다 */
	isCategoryCreating: boolean;
	/** 카테고리 해제. 넘기면 현재 카테고리가 있을 때 목록 아래에 해제 항목이 생긴다 */
	onRemove?: () => void;
	/** 카테고리가 하나도 없을 때 빈 상태 문구 아래에 둘 요소 */
	emptyAction?: ReactNode;
	/** 열리자마자 포커스할 검색창 ref */
	commandInputRef?: Ref<HTMLInputElement>;
	/** 검색창에서 Esc */
	onEscapeKeyDown?: () => void;
	className?: string;
}

/**
 * 메모 카테고리를 검색해 고르는 팝업 본문
 *
 * @description
 * 확장 사이드 패널(# 입력·칩)과 웹 메모 카드가 같은 본문을 쓴다. 팝업을 어디에
 * 어떻게 띄울지(fixed 위치·Popover)와 저장은 사용처가 맡고, 여기는 검색·현재 값
 * 체크·만들기·해제 항목만 그린다.
 */
export function CategoryCommand<TCategory extends TCategoryCommandItem>({
	categories,
	currentCategoryId,
	labels,
	onCategorySelect,
	onCategoryCreate,
	isCategoryCreating,
	onRemove,
	emptyAction,
	commandInputRef,
	onEscapeKeyDown,
	className,
}: IFCategoryCommandProps<TCategory>) {
	const [searchText, setSearchText] = useState("");
	const hasNoCategories = !categories?.length;
	const trimmedSearchText = searchText.trim();
	const hasSameNameCategory = Boolean(
		categories?.some(
			(category) =>
				category.name.toLowerCase() === trimmedSearchText.toLowerCase(),
		),
	);
	const isCreateItemVisible =
		trimmedSearchText.length > 0 && !hasSameNameCategory;
	const isRemoveItemVisible = Boolean(onRemove) && currentCategoryId !== null;

	return (
		<Command className={cn(className)}>
			<CommandInput
				ref={commandInputRef}
				placeholder={labels.search}
				value={searchText}
				onValueChange={setSearchText}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						onEscapeKeyDown?.();
					}
				}}
			/>
			<CommandList>
				{hasNoCategories ? (
					<>
						<p className="text-muted-foreground px-2 pt-4 pb-2 text-center text-sm">
							{labels.empty}
						</p>
						{emptyAction}
					</>
				) : (
					<>
						<CommandEmpty>{labels.noResult}</CommandEmpty>
						<CommandGroup>
							{categories?.map((category) => (
								<CommandItem
									key={category.id}
									onSelect={() => onCategorySelect(category)}
									className="flex items-center gap-2"
								>
									<div
										className="h-3 w-3 shrink-0 rounded-full"
										style={{
											backgroundColor: category.color || DEFAULT_CATEGORY_COLOR,
										}}
									/>
									<span className="truncate">{category.name}</span>
									{category.id === currentCategoryId && (
										<CheckIcon className="ml-auto" aria-hidden="true" />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}
				{isCreateItemVisible && (
					<CommandItem
						forceMount
						value="create-category-from-search"
						disabled={isCategoryCreating}
						onSelect={() => onCategoryCreate(trimmedSearchText)}
						data-testid="category-create-item"
						className="m-1"
					>
						<PlusIcon aria-hidden="true" />
						<span className="truncate">
							{labels.createNamed(trimmedSearchText)}
						</span>
					</CommandItem>
				)}
				{isRemoveItemVisible && (
					<>
						<CommandSeparator alwaysRender />
						<CommandGroup forceMount>
							<CommandItem
								forceMount
								value="remove-category"
								onSelect={onRemove}
								data-testid="category-remove-item"
								className="text-muted-foreground"
							>
								<BanIcon aria-hidden="true" />
								{labels.remove}
							</CommandItem>
						</CommandGroup>
					</>
				)}
			</CommandList>
		</Command>
	);
}
