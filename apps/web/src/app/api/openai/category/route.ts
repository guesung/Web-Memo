import { captureException } from "@sentry/nextjs";
import { readServerEnv } from "@src/utils/serverEnv";
import { APITimeoutError } from "@typesafe-ai/sdk";
import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
import { type NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse } from "../util";
import { JEV_MAX_CHOICES } from "./constant";
import type { IFJevCategoryResult } from "./jev";
import { getJevCategorySuggestion } from "./jev";
import type { IFCategorySuggestionResponse } from "./type";
import { validateRequest } from "./util";

/** Jev가 고른 기존 카테고리를 추천하고, 추천할 수 없으면 null을 반환합니다. */
export const POST = async (request: NextRequest) => {
	const requestStartedAt = performance.now();
	let jevDurationMs: number | null = null;
	let noSuggestionReason: string | null = null;
	let resultSource: "jev" | "none" = "none";
	let jevChoiceType: IFJevCategoryResult["choiceType"] = null;
	let jevConfidence: number | null = null;

	try {
		const validOrigin = `chrome-extension://${CHROME_EXTENSION_ID}`;

		if (request.headers.get("origin") !== validOrigin) {
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
			noSuggestionReason = "no_existing_categories";
		} else if (body.existingCategories.length > JEV_MAX_CHOICES) {
			noSuggestionReason = "choice_limit";
		} else {
			const typeSafeApiKey = readServerEnv("TYPESAFE_API_KEY");

			if (!typeSafeApiKey) {
				noSuggestionReason = "missing_jev_key";
				captureException(new Error("TYPESAFE_API_KEY is not configured"));
			} else {
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

					noSuggestionReason =
						jevResult.choiceType === "unknown"
							? "jev_unknown_choice"
							: "jev_invalid_confidence";
				} catch (error) {
					noSuggestionReason =
						error instanceof APITimeoutError ? "jev_timeout" : "jev_error";
					captureException(new Error("Jev category classification failed"), {
						tags: { cause: error instanceof Error ? error.name : "unknown" },
					});
				} finally {
					jevDurationMs = Math.round(performance.now() - jevStartedAt);
				}
			}
		}

		return NextResponse.json(
			{ suggestion: null } satisfies IFCategorySuggestionResponse,
			{ headers: CORS_HEADERS },
		);
	} catch (error) {
		noSuggestionReason = "request_error";
		captureException(error);

		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	} finally {
		console.info("Category suggestion result", {
			resultSource,
			noSuggestionReason,
			jevChoiceType,
			jevConfidence,
			jevDurationMs,
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
