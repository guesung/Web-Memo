import { captureException } from "@sentry/nextjs";
import { readServerEnv } from "@src/utils/serverEnv";
import { APITimeoutError } from "@typesafe-ai/sdk";
import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIApiKey } from "../config";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse, handleOpenAIError } from "../util";
import {
	JEV_CONFIDENCE_THRESHOLD,
	JEV_MAX_CHOICES,
	OPENAI_MODEL,
	OPENAI_SETTINGS,
	SYSTEM_MESSAGE,
} from "./constant";
import type { IFJevCategoryResult } from "./jev";
import { getJevCategorySuggestion } from "./jev";
import type { IFCategorySuggestionResponse } from "./type";
import {
	buildCategoryPrompt,
	findMatchingCategoryId,
	parseAIResponse,
	validateRequest,
} from "./util";

/** 기존 카테고리는 Jev로 우선 판정하고 나머지는 LLM으로 추천합니다. */
export const POST = async (request: NextRequest) => {
	const requestStartedAt = performance.now();
	let jevDurationMs: number | null = null;
	let openAiDurationMs: number | null = null;
	let fallbackReason: string | null = null;
	let resultSource: "jev" | "llm" | "none" = "none";
	let jevChoiceType: IFJevCategoryResult["choiceType"] = null;
	let jevConfidence: number | null = null;
	const openAIApiKey = getOpenAIApiKey();
	const typeSafeApiKey = readServerEnv("TYPESAFE_API_KEY");

	try {
		const origin = request.headers.get("origin");
		const validOrigin = `chrome-extension://${CHROME_EXTENSION_ID}`;

		if (origin !== validOrigin) {
			return createErrorResponse(
				ERROR_MESSAGES.UNAUTHORIZED,
				HTTP_STATUS.FORBIDDEN,
			);
		}

		const body = await request.json();

		if (!validateRequest(body)) {
			return createErrorResponse(
				"Invalid request format",
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		if (body.existingCategories.length === 0) {
			fallbackReason = "no_existing_categories";
		} else if (body.existingCategories.length >= JEV_MAX_CHOICES) {
			fallbackReason = "choice_limit";
		} else {
			if (typeSafeApiKey) {
				const jevStartedAt = performance.now();

				try {
					const jevResult = await getJevCategorySuggestion(
						body,
						typeSafeApiKey,
					);
					jevChoiceType = jevResult.choiceType;
					jevConfidence = jevResult.confidence;

					if (jevResult.suggestion) {
						resultSource = "jev";

						return NextResponse.json(
							{
								suggestion: jevResult.suggestion,
							} satisfies IFCategorySuggestionResponse,
							{ headers: CORS_HEADERS },
						);
					}

					if (jevResult.choiceType === "none") {
						fallbackReason = "jev_none";
					} else if (jevResult.choiceType === "unknown") {
						fallbackReason = "jev_unknown_choice";
					} else if (
						jevResult.confidence === null ||
						jevResult.confidence > 1
					) {
						fallbackReason = "jev_invalid_confidence";
					} else if (jevResult.confidence < JEV_CONFIDENCE_THRESHOLD) {
						fallbackReason = "jev_low_confidence";
					} else {
						fallbackReason = "jev_no_match";
					}
				} catch (error) {
					fallbackReason =
						error instanceof APITimeoutError ? "jev_timeout" : "jev_error";
					captureException(new Error("Jev category classification failed"), {
						tags: { cause: error instanceof Error ? error.name : "unknown" },
					});
				} finally {
					jevDurationMs = Math.round(performance.now() - jevStartedAt);
				}
			} else {
				fallbackReason = "missing_jev_key";
				captureException(new Error("TYPESAFE_API_KEY is not configured"));
			}
		}

		if (!openAIApiKey) {
			return createErrorResponse(
				"OpenAI API key not configured",
				HTTP_STATUS.INTERNAL_SERVER_ERROR,
			);
		}

		const openai = new OpenAI({
			apiKey: openAIApiKey,
		});

		const prompt = buildCategoryPrompt(body);

		const openAiStartedAt = performance.now();
		let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>;

		try {
			completion = await openai.chat.completions.create({
				model: OPENAI_MODEL,
				reasoning_effort: "none",
				messages: [
					{
						role: "system",
						content: SYSTEM_MESSAGE,
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: OPENAI_SETTINGS.temperature,
				response_format: OPENAI_SETTINGS.responseFormat,
			});
		} finally {
			openAiDurationMs = Math.round(performance.now() - openAiStartedAt);
		}

		const responseContent = completion.choices[0]?.message?.content;

		if (!responseContent) {
			return NextResponse.json(
				{ suggestion: null } satisfies IFCategorySuggestionResponse,
				{ headers: CORS_HEADERS },
			);
		}

		const parsed = parseAIResponse(responseContent);

		if (!parsed) {
			return NextResponse.json(
				{ suggestion: null } satisfies IFCategorySuggestionResponse,
				{ headers: CORS_HEADERS },
			);
		}

		let existingCategoryId: number | undefined;
		let isExisting = parsed.isExisting;

		if (parsed.isExisting) {
			existingCategoryId = findMatchingCategoryId(
				body.existingCategories,
				parsed.categoryName,
			);

			if (!existingCategoryId) {
				isExisting = false;
			}
		}

		const response: IFCategorySuggestionResponse = {
			suggestion: {
				categoryName: parsed.categoryName,
				isExisting,
				existingCategoryId,
				confidence: parsed.confidence,
				source: "llm",
			},
		};
		resultSource = "llm";

		return NextResponse.json(response, { headers: CORS_HEADERS });
	} catch (error) {
		return handleOpenAIError(error, "category");
	} finally {
		console.info("Category suggestion result", {
			resultSource,
			fallbackReason,
			jevChoiceType,
			jevConfidence,
			jevDurationMs,
			openAiDurationMs,
			totalDurationMs: Math.round(performance.now() - requestStartedAt),
		});
	}
};

/** 확장 프로그램의 CORS 사전 요청에 응답합니다. */
export const OPTIONS = async () => {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
};
