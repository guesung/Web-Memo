import type { IFPastMemoRequest } from "@web-memo/shared/types";

const PAGE_EXCERPT_MAX_LENGTH = 1000;

// jev는 NUL과 짝 없는 서로게이트가 든 텍스트를 "invalid Unicode text"로 400 거절한다.
// NUL은 지우고, 짝 없는 서로게이트는 U+FFFD로 바꿔 항상 올바른 UTF-16 문자열로 만든다.
const sanitizeText = (text: string) =>
	text.replaceAll("\u0000", "").toWellFormed();

/**
 * 과거 메모 판정 요청 본문을 검증한다.
 * @description pageUrl·pageTitle·pageExcerpt 중 하나라도 문자열이 아니면 null이다.
 * 세 필드 모두 NUL(U+0000)을 지우고 짝 없는 서로게이트를 U+FFFD로 바꾼다.
 * pageExcerpt가 1,000자(코드 포인트 기준)를 넘으면 거부하지 않고 1,000자로 잘라 쓴다.
 * 코드 포인트 단위로 자르므로 경계의 이모지 서로게이트 쌍이 쪼개지지 않는다.
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

	return {
		pageUrl: sanitizeText(pageUrl),
		pageTitle: sanitizeText(pageTitle),
		pageExcerpt: Array.from(sanitizeText(pageExcerpt))
			.slice(0, PAGE_EXCERPT_MAX_LENGTH)
			.join(""),
	};
};
