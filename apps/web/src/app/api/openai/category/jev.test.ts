import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	JEV_CONFIDENCE_THRESHOLD,
	JEV_MAX_CHOICES,
	JEV_MODEL,
} from "./constant";
import { getJevCategorySuggestion } from "./jev";
import type { IFCategorySuggestionRequest } from "./type";

const mocks = vi.hoisted(() => ({
	systemOne: vi.fn(),
}));

vi.mock("@typesafe-ai/sdk", () => ({
	choice: (instructions: string, criteria: Record<string, string>) => ({
		type: "choice",
		instructions,
		criteria,
	}),
	TypeSafeClient: class {
		systemOne = mocks.systemOne;
	},
}));

const REQUEST: IFCategorySuggestionRequest = {
	pageTitle: "TypeScript article",
	pageUrl: "https://example.com/typescript",
	pageContent: "Sensitive page content must not be sent to Jev",
	memoText: "Useful TypeScript tips",
	existingCategories: [
		{ id: 10, name: "개발" },
		{ id: 20, name: "디자인" },
	],
	pageLanguage: "ko",
};

describe("getJevCategorySuggestion", () => {
	beforeEach(() => {
		mocks.systemOne.mockReset();
	});

	it("높은 confidence의 기존 카테고리를 ID로 매핑하고 본문은 전송하지 않습니다", async () => {
		mocks.systemOne.mockResolvedValue({
			answers: {
				category: { choice: "c10", confidence: JEV_CONFIDENCE_THRESHOLD },
			},
		});

		const suggestion = await getJevCategorySuggestion(REQUEST, "test-key");

		expect(suggestion).toEqual({
			categoryName: "개발",
			isExisting: true,
			existingCategoryId: 10,
			confidence: JEV_CONFIDENCE_THRESHOLD,
			source: "jev",
		});
		expect(mocks.systemOne).toHaveBeenCalledWith(
			expect.objectContaining({
				model: JEV_MODEL,
				state: {
					page_title: REQUEST.pageTitle,
					page_url: REQUEST.pageUrl,
					memo: REQUEST.memoText,
				},
				questions: {
					category: expect.objectContaining({
						criteria: {
							c10: "개발",
							c20: "디자인",
							NONE: expect.any(String),
						},
					}),
				},
			}),
			expect.objectContaining({ retry: { maxRetries: 0 } }),
		);
	});

	it.each([
		{ choice: "NONE", confidence: 0.99 },
		{ choice: "c10", confidence: JEV_CONFIDENCE_THRESHOLD - 0.01 },
		{ choice: "c999", confidence: 0.99 },
		{ choice: "c10", confidence: Number.NaN },
	])("$choice 또는 신뢰도 부족일 때 LLM 경로로 넘깁니다", async (answer) => {
		mocks.systemOne.mockResolvedValue({ answers: { category: answer } });

		expect(await getJevCategorySuggestion(REQUEST, "test-key")).toBeNull();
	});

	it("카테고리 0개 또는 선택지 상한 초과 시 Jev를 호출하지 않습니다", async () => {
		const noCategoriesRequest = { ...REQUEST, existingCategories: [] };
		const tooManyCategoriesRequest = {
			...REQUEST,
			existingCategories: Array.from(
				{ length: JEV_MAX_CHOICES },
				(_, index) => ({
					id: index + 1,
					name: `Category ${index + 1}`,
				}),
			),
		};

		expect(
			await getJevCategorySuggestion(noCategoriesRequest, "test-key"),
		).toBeNull();
		expect(
			await getJevCategorySuggestion(tooManyCategoriesRequest, "test-key"),
		).toBeNull();
		expect(mocks.systemOne).not.toHaveBeenCalled();
	});
});
