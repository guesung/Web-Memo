import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JEV_MAX_CHOICES } from "./constant";

const mocks = vi.hoisted(() => ({
	systemOne: vi.fn(),
	captureException: vi.fn(),
	consoleInfo: vi.fn(),
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
	APITimeoutError: class extends Error {},
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
		vi.stubEnv("TYPESAFE_API_KEY", "test-jev-key");
		mocks.systemOne.mockReset();
		mocks.captureException.mockReset();
		mocks.consoleInfo.mockReset();
		vi.spyOn(console, "info").mockImplementation(mocks.consoleInfo);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("Jev가 고른 기존 카테고리를 낮은 confidence에도 제안합니다", async () => {
		vi.stubEnv("OPENAI_API_KEY", "");
		mocks.systemOne.mockResolvedValue({
			answers: { category: { choice: "c10", confidence: 0.42 } },
		});
		const { POST } = await import("./route");

		const response = await POST(createRequest());

		expect((await response.json()).suggestion).toEqual({
			categoryName: "개발",
			isExisting: true,
			existingCategoryId: 10,
			confidence: 0.42,
			source: "jev",
		});
		expect(mocks.consoleInfo).toHaveBeenCalledWith(
			"Category suggestion result",
			expect.objectContaining({
				resultSource: "jev",
				noSuggestionReason: null,
				jevChoiceType: "existing",
				jevConfidence: 0.42,
				jevDurationMs: expect.any(Number),
				totalDurationMs: expect.any(Number),
			}),
		);
	});

	it.each([
		{
			choice: "NONE",
			confidence: 0.99,
			reason: "jev_unknown_choice",
			choiceType: "unknown",
		},
		{
			choice: "c999",
			confidence: 0.99,
			reason: "jev_unknown_choice",
			choiceType: "unknown",
		},
		{
			choice: "c10",
			confidence: Number.NaN,
			reason: "jev_invalid_confidence",
			choiceType: "existing",
		},
	])(
		"알 수 없는 선택이나 유효하지 않은 confidence면 null을 반환합니다",
		async (answer) => {
			mocks.systemOne.mockResolvedValue({ answers: { category: answer } });
			const { POST } = await import("./route");

			const response = await POST(createRequest());

			expect((await response.json()).suggestion).toBeNull();
			expect(mocks.consoleInfo).toHaveBeenCalledWith(
				"Category suggestion result",
				expect.objectContaining({
					resultSource: "none",
					noSuggestionReason: answer.reason,
					jevChoiceType: answer.choiceType,
					jevConfidence: Number.isFinite(answer.confidence)
						? answer.confidence
						: null,
				}),
			);
		},
	);

	it.each([
		{ timeout: false, reason: "jev_error" },
		{ timeout: true, reason: "jev_timeout" },
	])(
		"Jev 오류와 타임아웃을 구분하고 null을 반환합니다",
		async ({ timeout, reason }) => {
			const { APITimeoutError } = await import("@typesafe-ai/sdk");
			mocks.systemOne.mockRejectedValue(
				timeout ? new APITimeoutError(3000) : new Error("network error"),
			);
			const { POST } = await import("./route");

			const response = await POST(createRequest());

			expect((await response.json()).suggestion).toBeNull();
			expect(mocks.captureException).toHaveBeenCalledOnce();
			expect(mocks.consoleInfo).toHaveBeenCalledWith(
				"Category suggestion result",
				expect.objectContaining({ noSuggestionReason: reason }),
			);
		},
	);

	it("로그에는 페이지 본문과 메모 원문을 남기지 않습니다", async () => {
		mocks.systemOne.mockResolvedValue({
			answers: { category: { choice: "c10", confidence: 0.9 } },
		});
		const { POST } = await import("./route");

		await POST(createRequest());

		const serializedLog = JSON.stringify(mocks.consoleInfo.mock.calls);
		expect(serializedLog).not.toContain("Article excerpt");
		expect(serializedLog).not.toContain("Useful article");
		expect(serializedLog).not.toContain("개발");
		expect(serializedLog).not.toContain("c10");
	});

	it("Jev 키가 없거나 카테고리가 0개 또는 255개 초과면 null을 반환합니다", async () => {
		vi.stubEnv("TYPESAFE_API_KEY", "");
		const { POST } = await import("./route");
		const tooManyCategories = Array.from(
			{ length: JEV_MAX_CHOICES + 1 },
			(_, index) => ({
				id: index + 1,
				name: `Category ${index + 1}`,
			}),
		);

		const missingKeyResponse = await POST(createRequest());
		const noCategoriesResponse = await POST(createRequest([]));
		const tooManyCategoriesResponse = await POST(
			createRequest(tooManyCategories),
		);

		expect((await missingKeyResponse.json()).suggestion).toBeNull();
		expect((await noCategoriesResponse.json()).suggestion).toBeNull();
		expect((await tooManyCategoriesResponse.json()).suggestion).toBeNull();
		expect(mocks.systemOne).not.toHaveBeenCalled();
		expect(mocks.captureException).toHaveBeenCalledOnce();
	});
});
