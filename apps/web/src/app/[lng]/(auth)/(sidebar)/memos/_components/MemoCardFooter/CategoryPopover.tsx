import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { CategoryRow } from "@web-memo/shared/types";
import {
	CategoryCommand,
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@web-memo/ui";

/** 카테고리 팝업 props */
interface IFCategoryPopoverProps extends LanguageType {
	isOpen: boolean;
	/** 팝업이 붙을 요소(칩 또는 ⋮ 버튼). 한 번도 열리지 않았으면 null */
	anchorElement: HTMLElement | null;
	/** 사용자의 카테고리 목록 */
	categories: CategoryRow[] | null | undefined;
	/** 메모에 지정된 카테고리 id. 해당 항목에 체크 표시를 한다 */
	currentCategoryId: number | null;
	isCategoryCreating: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onCategorySelect: (category: CategoryRow) => void;
	onCategoryCreate: (categoryName: string) => void;
	onCategoryRemove: () => void;
	onCloseAutoFocus: (event: Event) => void;
}

/**
 * 메모 카드의 카테고리 검색 팝업
 * @description 칩과 ⋮ 메뉴가 같은 팝업을 쓰므로 붙을 요소를 앵커로 받는다.
 * 사용처: MemoCardFooter/index.tsx
 */
export default function CategoryPopover({
	lng,
	isOpen,
	anchorElement,
	categories,
	currentCategoryId,
	isCategoryCreating,
	onOpenChange,
	onCategorySelect,
	onCategoryCreate,
	onCategoryRemove,
	onCloseAutoFocus,
}: IFCategoryPopoverProps) {
	const { t } = useTranslation(lng);

	return (
		<Popover open={isOpen} onOpenChange={onOpenChange}>
			{anchorElement && (
				<PopoverAnchor virtualRef={{ current: anchorElement }} />
			)}
			<PopoverContent
				side="bottom"
				align="start"
				className="w-64 p-0"
				data-testid="category-popover"
				onCloseAutoFocus={onCloseAutoFocus}
			>
				<CategoryCommand
					categories={categories}
					currentCategoryId={currentCategoryId}
					labels={{
						search: t("memos.categoryPopup.search"),
						noResult: t("memos.categoryPopup.noResult"),
						empty: t("memos.categoryPopup.empty"),
						// 카테고리 이름의 ' & 같은 문자가 HTML 엔티티로 바뀌지 않게 한다
						createNamed: (name) =>
							t("memos.categoryPopup.createNamed", {
								name,
								interpolation: { escapeValue: false },
							}),
						remove: t("memos.categoryPopup.remove"),
					}}
					onCategorySelect={onCategorySelect}
					onCategoryCreate={onCategoryCreate}
					isCategoryCreating={isCategoryCreating}
					onRemove={onCategoryRemove}
					emptyAction={
						<p className="text-muted-foreground px-2 pb-3 text-center text-xs">
							{t("memos.categoryPopup.emptyHint")}
						</p>
					}
				/>
			</PopoverContent>
		</Popover>
	);
}
