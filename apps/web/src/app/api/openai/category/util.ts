import type { IFCategorySuggestionRequest } from "./type";

/** 카테고리 추천 요청의 필수 필드와 기존 카테고리 형식을 검사합니다. */
export const validateRequest = (
	body: unknown,
): body is IFCategorySuggestionRequest => {
	if (!body || typeof body !== "object") {
		return false;
	}
	const data = body as Record<string, unknown>;

	return (
		typeof data.pageTitle === "string" &&
		typeof data.pageUrl === "string" &&
		typeof data.pageContent === "string" &&
		typeof data.memoText === "string" &&
		Array.isArray(data.existingCategories) &&
		data.existingCategories.every(
			(category: unknown) =>
				category !== null &&
				typeof category === "object" &&
				Number.isSafeInteger((category as { id?: unknown }).id) &&
				typeof (category as { name?: unknown }).name === "string",
		) &&
		typeof data.pageLanguage === "string"
	);
};
