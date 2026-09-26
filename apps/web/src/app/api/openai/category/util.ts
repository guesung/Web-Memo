import { PAGE_CONTENT_MAX_LENGTH } from "./constant";
import type { IFCategorySuggestionRequest, IFParsedAIResponse } from "./type";

/** 기존 LLM 분류 프롬프트를 생성합니다. */
export const buildCategoryPrompt = (
	data: IFCategorySuggestionRequest,
): string => {
	const categoryList =
		data.existingCategories.length > 0
			? data.existingCategories.map((c) => c.name).join(", ")
			: "None (please suggest a new category)";

	return `You are a category classifier for a memo/bookmark application.

Context:
- Page Title: ${data.pageTitle}
- Page URL: ${data.pageUrl}
- Page Content (excerpt): ${data.pageContent.slice(0, PAGE_CONTENT_MAX_LENGTH)}
- User's Memo: ${data.memoText}
- Page Language: ${data.pageLanguage}

User's existing categories: [${categoryList}]

Task: Suggest ONE category for this memo.

Rules:
1. If content matches an existing category, use that EXACT name (case-sensitive)
2. If no existing category fits well, suggest a NEW concise name (1-3 words)
3. Category name MUST be in ${data.pageLanguage === "ko" ? "Korean" : "the same language as the page content"}
4. Be specific but not too narrow (e.g., "개발" over "React useState 버그")
5. Return confidence 0.0-1.0 based on how well the category fits

Response format (JSON only, no markdown):
{
  "categoryName": "string",
  "isExisting": boolean,
  "confidence": number
}`;
};

/** 카테고리 추천 요청의 필수 필드를 검사합니다. */
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
		typeof data.pageLanguage === "string"
	);
};

/** LLM JSON 응답에서 제안에 필요한 필드만 읽습니다. */
export const parseAIResponse = (
	responseContent: string,
): IFParsedAIResponse | null => {
	try {
		const parsed = JSON.parse(responseContent);

		if (
			typeof parsed.categoryName !== "string" ||
			typeof parsed.isExisting !== "boolean" ||
			typeof parsed.confidence !== "number"
		) {
			return null;
		}

		return {
			categoryName: parsed.categoryName,
			isExisting: parsed.isExisting,
			confidence: parsed.confidence,
		};
	} catch {
		return null;
	}
};

/** 이름이 일치하는 기존 카테고리 ID를 찾습니다. */
export const findMatchingCategoryId = (
	categories: { id: number; name: string }[],
	categoryName: string,
): number | undefined => {
	const matchedCategory = categories.find(
		(c) => c.name.toLowerCase() === categoryName.toLowerCase(),
	);
	return matchedCategory?.id;
};
