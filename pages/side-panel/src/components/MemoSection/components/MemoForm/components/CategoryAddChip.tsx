import { I18n } from "@web-memo/shared/utils/extension";
import { badgeVariants, cn } from "@web-memo/ui";
import { PlusIcon } from "lucide-react";

/** 카테고리 추가 칩 props */
interface IFCategoryAddChipProps {
	/** 해제 직후 포커스를 받을 칩 ref */
	chipRef: React.RefObject<HTMLButtonElement | null>;
	/** 칩 클릭. 칩 기준으로 카테고리 팝업을 연다 */
	onChipClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * 메모에 카테고리가 없을 때 하단에 보이는 추가 칩
 * @description #을 모르는 사용자도 클릭으로 카테고리를 고를 수 있게 한다.
 * 사용처: MemoForm/index.tsx
 */
const CategoryAddChip = (props: IFCategoryAddChipProps) => {
	return (
		<button
			ref={props.chipRef}
			type="button"
			data-testid="category-add-chip"
			title={I18n.get("category_add_hash_hint")}
			onClick={props.onChipClick}
			className={cn(
				badgeVariants({ variant: "outline" }),
				"text-muted-foreground hover:text-foreground gap-1 border-dashed px-2 py-0.5",
			)}
		>
			<PlusIcon size={12} aria-hidden="true" />
			{I18n.get("category_add")}
		</button>
	);
};

export default CategoryAddChip;
