import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	JEV_MAX_CHOICES,
	JEV_MODEL,
	PAGE_CONTENT_MAX_LENGTH,
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
	pageContent: "Article excerpt ".repeat(200),
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

	it("기존 카테고리를 ID로 매핑하고 웹페이지·메모를 전송하며 NONE을 제외합니다", async () => {
		mocks.systemOne.mockResolvedValue({
			answers: { category: { choice: "c10", confidence: 0.42 } },
		});

		const result = await getJevCategorySuggestion(REQUEST, "test-key");

		expect(result).toEqual({
			suggestion: {
				categoryName: "개발",
				isExisting: true,
				existingCategoryId: 10,
				confidence: 0.42,
				source: "jev",
			},
			choiceType: "existing",
			confidence: 0.42,
		});
		expect(mocks.systemOne).toHaveBeenCalledWith(
			expect.objectContaining({
				model: JEV_MODEL,
				state: {
					page_title: REQUEST.pageTitle,
					page_url: REQUEST.pageUrl,
					page_content: REQUEST.pageContent.slice(0, PAGE_CONTENT_MAX_LENGTH),
					memo: REQUEST.memoText,
				},
				questions: {
					category: expect.objectContaining({
						criteria: { c10: "개발", c20: "디자인" },
					}),
				},
			}),
			expect.objectContaining({ retry: { maxRetries: 0 } }),
		);
		expect(
			mocks.systemOne.mock.calls[0][0].questions.category.instructions,
		).toContain("page_content");
	});

	it.each([
		{ choice: "NONE", confidence: 0.99, choiceType: "unknown" },
		{ choice: "c999", confidence: 0.99, choiceType: "unknown" },
		{ choice: "c10", confidence: Number.NaN, choiceType: "existing" },
		{ choice: "c10", confidence: -0.1, choiceType: "existing" },
		{ choice: "c10", confidence: 1.1, choiceType: "existing" },
	])(
		"알 수 없는 선택 또는 유효하지 않은 confidence는 추천하지 않습니다",
		async (answer) => {
			mocks.systemOne.mockResolvedValue({ answers: { category: answer } });

			expect(await getJevCategorySuggestion(REQUEST, "test-key")).toEqual({
				suggestion: null,
				choiceType: answer.choiceType,
				confidence: Number.isFinite(answer.confidence)
					? answer.confidence
					: null,
			});
		},
	);

	it("카테고리 0개 또는 선택지 상한 초과 시 Jev를 호출하지 않습니다", async () => {
		const noCategoriesRequest = { ...REQUEST, existingCategories: [] };
		const tooManyCategoriesRequest = {
			...REQUEST,
			existingCategories: Array.from(
				{ length: JEV_MAX_CHOICES + 1 },
				(_, index) => ({ id: index + 1, name: `Category ${index + 1}` }),
			),
		};

		expect(
			await getJevCategorySuggestion(noCategoriesRequest, "test-key"),
		).toEqual({
			suggestion: null,
			choiceType: null,
			confidence: null,
		});
		expect(
			await getJevCategorySuggestion(tooManyCategoriesRequest, "test-key"),
		).toEqual({
			suggestion: null,
			choiceType: null,
			confidence: null,
		});
		expect(mocks.systemOne).not.toHaveBeenCalled();
	});

	it("카테고리 255개는 모두 Jev 선택지로 전달합니다", async () => {
		mocks.systemOne.mockResolvedValue({
			answers: { category: { choice: "c255", confidence: 0.7 } },
		});
		const categories = Array.from({ length: JEV_MAX_CHOICES }, (_, index) => ({
			id: index + 1,
			name: `Category ${index + 1}`,
		}));

		const result = await getJevCategorySuggestion(
			{ ...REQUEST, existingCategories: categories },
			"test-key",
		);

		expect(result.suggestion?.existingCategoryId).toBe(255);
		expect(
			Object.keys(mocks.systemOne.mock.calls[0][0].questions.category.criteria),
		).toHaveLength(255);
	});
});
