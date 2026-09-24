import { toLooseUrlKey } from "@web-memo/shared/utils/url";
import type { IFRecentMemo } from "./getRecentMemos";

/**
 * 느슨한 URL 키가 현재 페이지와 같은 메모를 찾는다.
 * @description memos는 최근 수정 순이어야 한다. 같은 키가 여럿이면 가장 앞(가장 최근) 하나를 돌려준다.
 * 현재 페이지 URL을 파싱할 수 없으면 null이다.
 */
export const matchByLooseUrl = ({
	pageUrl,
	memos,
}: {
	pageUrl: string;
	memos: IFRecentMemo[];
}): IFRecentMemo | null => {
	const pageKey = toLooseUrlKey(pageUrl);

	if (pageKey === null) {
		return null;
	}

	return memos.find((memo) => toLooseUrlKey(memo.url) === pageKey) ?? null;
};
