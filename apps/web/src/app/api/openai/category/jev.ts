import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import {
	JEV_CONFIDENCE_THRESHOLD,
	JEV_MAX_CHOICES,
	JEV_MODEL,
	JEV_TIMEOUT,
} from "./constant";
import type {
	IFCategorySuggestionRequest,
	IFCategorySuggestionResponse,
} from "./type";

/** Jev가 높은 확신으로 선택한 기존 카테고리만 반환합니다. */
export const getJevCategorySuggestion = async (
	request: IFCategorySuggestionRequest,
	apiKey: string,
): Promise<IFCategorySuggestionResponse["suggestion"]> => {
	if (
		request.existingCategories.length === 0 ||
		request.existingCategories.length >= JEV_MAX_CHOICES
	) {
		return null;
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
				memo: request.memoText,
			},
			questions: {
				category: choice(
					"The user saved `memo` while reading the web page `page_title` (`page_url`). Which of the user's existing categories should this memo be filed under? Choose NONE if no category fits well.",
					criteria,
				),
			},
		},
		{ timeout: JEV_TIMEOUT, retry: { maxRetries: 0 } },
	);

	const answer = result.answers.category;

	if (
		answer.choice === "NONE" ||
		!Number.isFinite(answer.confidence) ||
		answer.confidence < JEV_CONFIDENCE_THRESHOLD ||
		answer.confidence > 1
	) {
		return null;
	}

	const selectedCategory = request.existingCategories.find(
		(category) => `c${category.id}` === answer.choice,
	);

	if (!selectedCategory) {
		return null;
	}

	return {
		categoryName: selectedCategory.name,
		isExisting: true,
		existingCategoryId: selectedCategory.id,
		confidence: answer.confidence,
		source: "jev",
	};
};
