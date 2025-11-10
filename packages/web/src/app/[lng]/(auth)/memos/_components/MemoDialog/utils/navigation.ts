import type { SearchParamKeyType } from "@web-memo/shared/modules/search-params";

interface SearchParamsWithUrl {
	removeAll: (key: SearchParamKeyType) => void;
	getUrl: () => string;
}

export function closeDialogWithNavigation(
	memoId: number,
	searchParams: SearchParamsWithUrl,
) {
	const isHasPreviousPage = history.state?.openedMemoId === memoId;

	if (isHasPreviousPage) {
		history.back();
	} else {
		searchParams.removeAll("id");
		history.pushState({}, "", searchParams.getUrl());
	}
}
