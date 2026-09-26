import { captureException } from "@sentry/nextjs";
import { readServerEnv } from "@src/utils/serverEnv";
import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIApiKey } from "../config";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse, handleOpenAIError } from "../util";
import {
	JEV_MAX_CHOICES,
	OPENAI_MODEL,
	OPENAI_SETTINGS,
	SYSTEM_MESSAGE,
} from "./constant";
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

		if (
			body.existingCategories.length > 0 &&
			body.existingCategories.length < JEV_MAX_CHOICES
		) {
			if (typeSafeApiKey) {
				try {
					const jevSuggestion = await getJevCategorySuggestion(
						body,
						typeSafeApiKey,
					);

					if (jevSuggestion) {
						return NextResponse.json(
							{
								suggestion: jevSuggestion,
							} satisfies IFCategorySuggestionResponse,
							{ headers: CORS_HEADERS },
						);
					}
				} catch (error) {
					captureException(new Error("Jev category classification failed"), {
						tags: { cause: error instanceof Error ? error.name : "unknown" },
					});
				}
			} else {
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

		const completion = await openai.chat.completions.create({
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

		return NextResponse.json(response, { headers: CORS_HEADERS });
	} catch (error) {
		console.error("Category suggestion error:", error);

		return handleOpenAIError(error, "category");
	}
};

/** 확장 프로그램의 CORS 사전 요청에 응답합니다. */
export const OPTIONS = async () => {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
};
