import { CLIENT_CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { SearchParams } from "@web-memo/shared/modules/search-params";

interface GetMemoUrlParams {
	id?: number;
	isWish?: boolean;
}

export const getMemoUrl = ({ id, isWish }: GetMemoUrlParams) => {
	const searchParams = new SearchParams();
	if (id) searchParams.set("id", String(id));
	if (isWish) searchParams.set("isWish", "true");

	return `${CLIENT_CONFIG.webUrl}${PATHS.memos}${searchParams.getSearchParams()}`;
};

export const getMemoWishListUrl = (id?: number) => {
	const searchParams = new SearchParams();
	searchParams.set("isWish", "true");
	if (id) searchParams.set("id", String(id));

	return `${CLIENT_CONFIG.webUrl}${PATHS.memos}${searchParams.getSearchParams()}`;
};
