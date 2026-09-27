import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import {
	JEV_CONFIDENCE_THRESHOLD,
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
	choiceType: "none" | "existing" | "unknown" | null;
	confidence: number | null;
}

/** Jev의 선택 유형과 확신도를 보존하고, 높은 확신의 기존 카테고리만 추천합니다. */
export const getJevCategorySuggestion = async (
	request: IFCategorySuggestionRequest,
	apiKey: string,
): Promise<IFJevCategoryResult> => {
	if (
		request.existingCategories.length === 0 ||
		request.existingCategories.length >= JEV_MAX_CHOICES
	) {
		return { suggestion: null, choiceType: null, confidence: null };
	}

	const criteria: Record<string, string> = {};

	for (const category of request.existingCategories) {
		criteria[`c${category.id}`] = category.name;
	}

	criteria.NONE = "None of the listed categories fits this memo well";

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
					"The user saved `memo` while reading the web page `page_title` (`page_url`). Consider the `page_content` excerpt as context. Which of the user's existing categories should this memo be filed under? Choose NONE if no category fits well.",
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

	if (answer.choice === "NONE") {
		return { suggestion: null, choiceType: "none", confidence };
	}

	const selectedCategory = request.existingCategories.find(
		(category) => `c${category.id}` === answer.choice,
	);

	if (!selectedCategory) {
		return { suggestion: null, choiceType: "unknown", confidence };
	}

	if (
		confidence === null ||
		confidence < JEV_CONFIDENCE_THRESHOLD ||
		confidence > 1
	) {
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
