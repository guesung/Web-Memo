import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	CategoryCommand,
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@web-memo/ui";
import type { TMemoCategoryPopover } from "./useMemoCategoryPopover";

/** 카테고리 팝업 props */
interface IFCategoryPopoverProps extends LanguageType {
	/** useMemoCategoryPopover가 돌려준 팝업 상태 */
	popover: TMemoCategoryPopover;
}

/**
 * 메모의 카테고리 검색 팝업
 * @description 칩·배지·⋮ 메뉴·본문 #이 같은 팝업을 쓰므로 붙을 기준을 앵커로 받는다.
 * 사용처: MemoCardFooter/index.tsx, MemoDialog/index.tsx
 */
export default function CategoryPopover({
	lng,
	popover,
}: IFCategoryPopoverProps) {
	const { t } = useTranslation(lng);

	return (
		<Popover open={popover.isOpen} onOpenChange={popover.handleOpenChange}>
			{popover.anchor && (
				<PopoverAnchor virtualRef={{ current: popover.anchor }} />
			)}
			<PopoverContent
				side="bottom"
				align="start"
				className="w-64 p-0"
				data-testid="category-popover"
				onCloseAutoFocus={popover.handleCloseAutoFocus}
			>
				<CategoryCommand
					categories={popover.categories}
					currentCategoryId={popover.currentCategoryId}
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
					onCategorySelect={popover.handleCategorySelect}
					onCategoryCreate={popover.handleCategoryCreate}
					isCategoryCreating={popover.isCategoryCreating}
					onRemove={popover.handleCategoryRemove}
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
