import { I18n } from "@web-memo/shared/utils/extension";
import { badgeVariants, cn } from "@web-memo/ui";
import { PlusIcon } from "lucide-react";

/** 카테고리 추가 칩 props */
interface IFCategoryAddChipProps {
	/** 해제 직후 포커스를 받을 칩 ref */
	chipRef: React.RefObject<HTMLButtonElement | null>;
	/** 칩 클릭. 칩 기준으로 카테고리 팝업을 연다 */
	onChipClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
	/** 메모 조회가 끝나지 않아 눌러도 반응하지 않아야 하는지 */
	isDisabled?: boolean;
	/** 잠금이 눈에 띄게 오래 지속돼 흐리게 보여줄지 */
	isDimmed?: boolean;
	/** 있으면 칩을 막고 이 문구를 title로 보여준다(오프라인·동기화 중). 잠금(isDisabled)이 함께 걸리면 잠금이 우선한다 */
	disabledReason?: string;
}

/**
 * 메모에 카테고리가 없을 때 하단에 보이는 추가 칩
 * @description #을 모르는 사용자도 클릭으로 카테고리를 고를 수 있게 한다.
 * 사용처: MemoForm/index.tsx
 */
const CategoryAddChip = (props: IFCategoryAddChipProps) => {
	const isDisabled = props.isDisabled || !!props.disabledReason;
	const title =
		!props.isDisabled && props.disabledReason
			? props.disabledReason
			: I18n.get("category_add_hash_hint");

	return (
		<button
			ref={props.chipRef}
			type="button"
			data-testid="category-add-chip"
			title={title}
			disabled={isDisabled}
			onClick={props.onChipClick}
			className={cn(
				badgeVariants({ variant: "outline" }),
				"text-muted-foreground hover:text-foreground gap-1 border-dashed px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-50",
				props.isDimmed && "opacity-50",
			)}
		>
			<PlusIcon size={12} aria-hidden="true" />
			{I18n.get("category_add")}
		</button>
	);
};

export default CategoryAddChip;
