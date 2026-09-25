import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIApiKey } from "../config";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse, handleOpenAIError } from "../util";
import { OPENAI_MODEL, OPENAI_SETTINGS, SYSTEM_MESSAGE } from "./constant";
import type { CategorySuggestionResponse } from "./type";
import {
	buildCategoryPrompt,
	findMatchingCategoryId,
	parseAIResponse,
	validateRequest,
} from "./util";

/** 페이지와 메모를 분석해 카테고리를 추천한다. */
export const POST = async (request: NextRequest) => {
	const openAIApiKey = getOpenAIApiKey();

	if (!openAIApiKey) {
		return createErrorResponse(
			"OpenAI API key not configured",
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}

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
				{ suggestion: null } satisfies CategorySuggestionResponse,
				{ headers: CORS_HEADERS },
			);
		}

		const parsed = parseAIResponse(responseContent);

		if (!parsed) {
			return NextResponse.json(
				{ suggestion: null } satisfies CategorySuggestionResponse,
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

		const response: CategorySuggestionResponse = {
			suggestion: {
				categoryName: parsed.categoryName,
				isExisting,
				existingCategoryId,
				confidence: parsed.confidence,
			},
		};

		return NextResponse.json(response, { headers: CORS_HEADERS });
	} catch (error) {
		console.error("Category suggestion error:", error);

		return handleOpenAIError(error, "category");
	}
};

/** 사전 CORS 요청에 공통 허용 헤더로 응답한다. */
export const OPTIONS = async () => {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
};
