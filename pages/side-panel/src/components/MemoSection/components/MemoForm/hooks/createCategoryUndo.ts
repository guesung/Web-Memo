import { analytics } from "@web-memo/shared/modules/analytics";
import { getTabInfo } from "@web-memo/shared/utils/extension";

/** 자동 적용된 카테고리를 해당 메모 화면에서만 되돌리는 동작을 만듭니다. */
export const createCategoryUndo = (params: IFCreateCategoryUndoParams) => {
	let hasUndone = false;

	return async () => {
		if (hasUndone) {
			return;
		}
		const currentTab = await getTabInfo();
		if (
			currentTab.url !== params.appliedUrl ||
			params.getCurrentMemoId() !== params.appliedMemoId
		) {
			return;
		}
		hasUndone = true;
		params.dismissUrl();
		if (params.getCurrentCategoryId() !== params.appliedCategoryId) {
			return;
		}
		params.onUndo();
		analytics.trackEvent({
			name: "category_suggestion_undo",
			params: { source: "jev" },
		});
	};
};

/** 자동 적용 당시의 페이지·메모와 현재 상태를 비교하는 데 필요한 값입니다. */
interface IFCreateCategoryUndoParams {
	appliedUrl: string;
	appliedMemoId: number | null;
	appliedCategoryId: number;
	getCurrentMemoId: () => number | null;
	getCurrentCategoryId: () => number | null;
	dismissUrl: () => void;
	onUndo: () => void;
}
