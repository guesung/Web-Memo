import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import {
	JEV_MAX_CHOICES,
	JEV_MODEL,
	JEV_TIMEOUT,
	PAGE_CONTENT_MAX_LENGTH,
} from "./constant";
import type {
	IFCategorySuggestionRequest,
	IFCategorySuggestionResponse,
} from "./type";

/** Jev 판정 결과와 민감정보를 제외한 관측값입니다. */
export interface IFJevCategoryResult {
	suggestion: IFCategorySuggestionResponse["suggestion"];
	choiceType: "existing" | "unknown" | null;
	confidence: number | null;
}

/** Jev가 고른 기존 카테고리와 관측용 선택 유형·확신도를 반환합니다. */
export const getJevCategorySuggestion = async (
	request: IFCategorySuggestionRequest,
	apiKey: string,
): Promise<IFJevCategoryResult> => {
	if (
		request.existingCategories.length === 0 ||
		request.existingCategories.length > JEV_MAX_CHOICES
	) {
		return { suggestion: null, choiceType: null, confidence: null };
	}

	const criteria: Record<string, string> = {};

	for (const category of request.existingCategories) {
		criteria[`c${category.id}`] = category.name;
	}

	const client = new TypeSafeClient({ apiKey, logLevel: "off" });
	const result = await client.systemOne(
		{
			model: JEV_MODEL,
			state: {
				page_title: request.pageTitle,
				page_url: request.pageUrl,
				page_content: request.pageContent.slice(0, PAGE_CONTENT_MAX_LENGTH),
				memo: request.memoText,
			},
			questions: {
				category: choice(
					"The user saved `memo` while reading the web page `page_title` (`page_url`). Consider the `page_content` excerpt as context. Choose the closest category from the user's existing categories for this memo.",
					criteria,
				),
			},
		},
		{ timeout: JEV_TIMEOUT, retry: { maxRetries: 0 } },
	);

	const answer = result.answers.category;
	const confidence = Number.isFinite(answer.confidence)
		? answer.confidence
		: null;

	const selectedCategory = request.existingCategories.find(
		(category) => `c${category.id}` === answer.choice,
	);

	if (!selectedCategory) {
		return { suggestion: null, choiceType: "unknown", confidence };
	}

	if (confidence === null || confidence < 0 || confidence > 1) {
		return { suggestion: null, choiceType: "existing", confidence };
	}

	return {
		suggestion: {
			categoryName: selectedCategory.name,
			isExisting: true,
			existingCategoryId: selectedCategory.id,
			confidence,
			source: "jev",
		},
		choiceType: "existing",
		confidence,
	};
};
