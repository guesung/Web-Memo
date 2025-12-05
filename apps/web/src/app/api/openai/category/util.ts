import { PAGE_CONTENT_MAX_LENGTH } from "./constant";
import type {
	CategorySuggestionRequest,
	ParsedAIResponse,
} from "./type";

export function buildCategoryPrompt(data: CategorySuggestionRequest): string {
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
}

export function validateRequest(
	body: unknown,
): body is CategorySuggestionRequest {
	if (!body || typeof body !== "object") return false;
	const data = body as Record<string, unknown>;

	return (
		typeof data.pageTitle === "string" &&
		typeof data.pageUrl === "string" &&
		typeof data.pageContent === "string" &&
		typeof data.memoText === "string" &&
		Array.isArray(data.existingCategories) &&
		typeof data.pageLanguage === "string"
	);
}

export function parseAIResponse(responseContent: string): ParsedAIResponse | null {
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
}

export function findMatchingCategoryId(
	categories: { id: number; name: string }[],
	categoryName: string,
): number | undefined {
	const matchedCategory = categories.find(
		(c) => c.name.toLowerCase() === categoryName.toLowerCase(),
	);
	return matchedCategory?.id;
}
