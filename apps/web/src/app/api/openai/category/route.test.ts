import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	systemOne: vi.fn(),
	completionCreate: vi.fn(),
	captureException: vi.fn(),
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

vi.mock("openai", () => ({
	default: class {
		chat = { completions: { create: mocks.completionCreate } };
	},
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: mocks.captureException,
}));

vi.mock("@web-memo/shared/constants", () => ({
	CHROME_EXTENSION_ID: "test-extension-id",
}));

vi.mock("@web-memo/shared/utils", () => ({
	createErrorReporter: () => vi.fn(),
}));

const createRequest = (existingCategories = [{ id: 10, name: "개발" }]) =>
	new NextRequest("http://localhost/api/openai/category", {
		method: "POST",
		headers: {
			origin: "chrome-extension://test-extension-id",
			"content-type": "application/json",
		},
		body: JSON.stringify({
			pageTitle: "TypeScript",
			pageUrl: "https://example.com",
			pageContent: "Article excerpt",
			memoText: "Useful article",
			existingCategories,
			pageLanguage: "ko",
		}),
	});

describe("POST /api/openai/category", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
		vi.stubEnv("TYPESAFE_API_KEY", "test-jev-key");
		mocks.systemOne.mockReset();
		mocks.completionCreate.mockReset();
		mocks.captureException.mockReset();
		mocks.completionCreate.mockResolvedValue({
			choices: [
				{
					message: {
						content: JSON.stringify({
							categoryName: "새 분류",
							isExisting: false,
							confidence: 0.9,
						}),
					},
				},
			],
		});
	});

	it("Jev의 높은 확신으로 기존 카테고리를 바로 반환합니다", async () => {
		mocks.systemOne.mockResolvedValue({
			answers: { category: { choice: "c10", confidence: 0.85 } },
		});
		const { POST } = await import("./route");

		const response = await POST(createRequest());

		expect((await response.json()).suggestion).toMatchObject({
			categoryName: "개발",
			existingCategoryId: 10,
			source: "jev",
		});
		expect(mocks.completionCreate).not.toHaveBeenCalled();
	});

	it.each([
		{ choice: "NONE", confidence: 0.99 },
		{ choice: "c10", confidence: 0.84 },
	])("$choice 또는 저신뢰 결과는 LLM으로 폴백합니다", async (answer) => {
		mocks.systemOne.mockResolvedValue({ answers: { category: answer } });
		const { POST } = await import("./route");

		const response = await POST(createRequest());

		expect((await response.json()).suggestion).toMatchObject({
			categoryName: "새 분류",
			source: "llm",
		});
		expect(mocks.completionCreate).toHaveBeenCalledOnce();
	});

	it("Jev 오류를 Sentry에 보고하고 LLM으로 폴백합니다", async () => {
		mocks.systemOne.mockRejectedValue(new Error("network error"));
		const { POST } = await import("./route");

		const response = await POST(createRequest());

		expect((await response.json()).suggestion.source).toBe("llm");
		expect(mocks.captureException).toHaveBeenCalledOnce();
	});

	it("키가 없거나 기존 카테고리가 없으면 Jev를 건너뜁니다", async () => {
		vi.stubEnv("TYPESAFE_API_KEY", "");
		const { POST } = await import("./route");

		const missingKeyResponse = await POST(createRequest());
		const noCategoriesResponse = await POST(createRequest([]));

		expect((await missingKeyResponse.json()).suggestion.source).toBe("llm");
		expect((await noCategoriesResponse.json()).suggestion.source).toBe("llm");
		expect(mocks.systemOne).not.toHaveBeenCalled();
		expect(mocks.captureException).toHaveBeenCalledOnce();
	});
});
