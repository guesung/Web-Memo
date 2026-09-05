import { CONFIG } from "@web-memo/env";
import {
	MEMO_STATUS_KEYS,
	PATHS,
	type TMemoStatusKey,
} from "@web-memo/shared/constants";
import { SearchParams } from "@web-memo/shared/modules/search-params";

/**
 * 웹 메모 목록 URL을 만들 때 넘기는 조건.
 * @description 상태 키는 이름 그대로 검색 파라미터가 되므로 따로 매핑하지 않는다.
 */
export interface IFMemoUrlParams
	extends Partial<Record<TMemoStatusKey, boolean>> {
	id?: number;
}

/**
 * 주어진 조건이 걸린 웹 메모 목록 URL을 만든다.
 */
export const getMemoUrl = (memoUrlParams: IFMemoUrlParams) => {
	const searchParams = new SearchParams();

	if (memoUrlParams.id) {
		searchParams.set("id", String(memoUrlParams.id));
	}
	MEMO_STATUS_KEYS.forEach((statusKey) => {
		if (memoUrlParams[statusKey]) {
			searchParams.set(statusKey, "true");
		}
	});

	return `${CONFIG.webUrl}${PATHS.memos}${searchParams.getSearchParams()}`;
};

export const getMemoWishListUrl = (id?: number) => {
	const searchParams = new SearchParams();
	searchParams.set("isWish", "true");
	if (id) searchParams.set("id", String(id));

	return `${CONFIG.webUrl}${PATHS.memos}${searchParams.getSearchParams()}`;
};
