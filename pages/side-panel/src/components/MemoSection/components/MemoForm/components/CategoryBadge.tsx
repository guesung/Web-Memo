import { DEFAULT_CATEGORY_COLOR } from "@web-memo/shared/constants";
import type { CategoryRow } from "@web-memo/shared/types";
import { I18n } from "@web-memo/shared/utils/extension";
import { Badge, cn } from "@web-memo/ui";
import { XIcon } from "lucide-react";

/** 현재 카테고리 배지 props */
interface IFCategoryBadgeProps {
	/** 메모에 지정된 카테고리 */
	category: CategoryRow;
	/** 배지 본문 버튼. 버튼 경로로 고른 뒤 포커스를 돌려받는다 */
	badgeButtonRef: React.RefObject<HTMLButtonElement | null>;
	/** 배지 본문 클릭. 배지 기준으로 카테고리 팝업을 연다 */
	onBadgeButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
	/** X 클릭. 카테고리를 해제한다 */
	onRemoveButtonClick: () => void;
	/** 메모 조회가 끝나지 않아 눌러도 반응하지 않아야 하는지 */
	isDisabled?: boolean;
	/** 잠금이 눈에 띄게 오래 지속돼 흐리게 보여줄지 */
	isDimmed?: boolean;
}

/**
 * 메모에 지정된 카테고리 배지
 * @description 본문을 누르면 카테고리를 바꾸고, X를 누르면 해제한다. 두 동작은 별도 버튼이다.
 * 사용처: MemoForm/index.tsx
 */
const CategoryBadge = (props: IFCategoryBadgeProps) => {
	const handleRemoveButtonClick = (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();
		props.onRemoveButtonClick();
	};

	return (
		<Badge
			variant="outline"
			data-testid="category-badge"
			className={cn(
				"flex items-center gap-1 px-2 py-0.5",
				props.isDimmed && "opacity-50",
			)}
		>
			<button
				ref={props.badgeButtonRef}
				type="button"
				aria-label={I18n.get("category_change")}
				title={props.category.name}
				onClick={props.onBadgeButtonClick}
				disabled={props.isDisabled}
				className="focus-visible:ring-ring flex min-w-0 items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-1"
			>
				<div
					className="h-2 w-2 shrink-0 rounded-full"
					style={{
						backgroundColor: props.category.color || DEFAULT_CATEGORY_COLOR,
					}}
				/>
				<span className="max-w-32 truncate">{props.category.name}</span>
			</button>
			<button
				type="button"
				aria-label={I18n.get("category_remove")}
				onClick={handleRemoveButtonClick}
				disabled={props.isDisabled}
				className="hover:text-destructive focus-visible:ring-ring ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-1"
			>
				<XIcon size={12} aria-hidden="true" />
			</button>
		</Badge>
	);
};

export default CategoryBadge;
