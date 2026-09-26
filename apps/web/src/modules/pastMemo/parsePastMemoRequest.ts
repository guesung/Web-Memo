import type { IFPastMemoRequest } from "@web-memo/shared/types";

/**
 * 과거 메모 판정 요청 본문을 검증한다.
 * @description pageUrl·pageTitle·pageExcerpt 중 하나라도 문자열이 아니면 null이다.
 * pageExcerpt가 1,000자를 넘으면 거부하지 않고 1,000자로 잘라 쓴다.
 */
export const parsePastMemoRequest = (
	body: unknown,
): IFPastMemoRequest | null => {
	if (typeof body !== "object" || body === null) {
		return null;
	}

	const { pageUrl, pageTitle, pageExcerpt } = body as Record<string, unknown>;

	if (
		typeof pageUrl !== "string" ||
		typeof pageTitle !== "string" ||
		typeof pageExcerpt !== "string"
	) {
		return null;
	}

	return { pageUrl, pageTitle, pageExcerpt: pageExcerpt.slice(0, 1000) };
};
