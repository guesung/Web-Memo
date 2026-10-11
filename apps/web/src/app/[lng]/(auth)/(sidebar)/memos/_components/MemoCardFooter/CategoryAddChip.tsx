import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { badgeVariants, cn } from "@web-memo/ui";
import { PlusIcon } from "lucide-react";
import type { MouseEvent, Ref } from "react";

/** 카테고리 추가 칩 props */
interface IFCategoryAddChipProps extends LanguageType {
	/** 해제 직후 포커스를 받을 칩 ref */
	chipRef: Ref<HTMLButtonElement>;
	/** 칩 클릭. 선택 모드에서는 카드 선택으로 넘기므로 호출부가 판단한다 */
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * 카테고리가 없는 메모 카드에서 배지 자리에 보이는 추가 칩
 * @description 눌러 카테고리 팝업을 연다. 사용처: MemoCardFooter/index.tsx
 */
export default function CategoryAddChip({
	lng,
	chipRef,
	onClick,
}: IFCategoryAddChipProps) {
	const { t } = useTranslation(lng);

	return (
		<button
			ref={chipRef}
			type="button"
			data-testid="category-add-chip"
			onClick={onClick}
			className={cn(
				badgeVariants({ variant: "outline" }),
				"text-muted-foreground hover:text-foreground w-fit gap-1 border-dashed px-2 py-0.5",
			)}
		>
			<PlusIcon size={12} aria-hidden="true" />
			{t("memos.categoryAdd")}
		</button>
	);
}
