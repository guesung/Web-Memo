import { captureException, flush } from "@sentry/nextjs";
import { runAfterResponse } from "@src/modules/slack/afterResponse";
import {
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";
import { createErrorReporter } from "@web-memo/shared/utils";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { getOpenAIApiKey } from "./config";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "./constant";
import type { ValidationResult } from "./type";

/** OpenAI 요청 메시지의 필수 필드를 검증한다. */
export const validateMessages = (messages: unknown): ValidationResult => {
	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return { isValid: false, error: ERROR_MESSAGES.MISSING_MESSAGES };
	}

	const isValidMessage = messages.every((msg: unknown) => {
		if (!msg || typeof msg !== "object") {
			return false;
		}
		const message = msg as Record<string, unknown>;
		return (
			typeof message.role === "string" && typeof message.content === "string"
		);
	});

	if (!isValidMessage) {
		return { isValid: false, error: ERROR_MESSAGES.INVALID_MESSAGE_FORMAT };
	}

	return { isValid: true };
};

/** 공통 CORS 헤더를 포함한 오류 응답을 생성한다. */
export const createErrorResponse = (error: string, status: number) => {
	return NextResponse.json({ error }, { status, headers: CORS_HEADERS });
};

/** OpenAI 호출 실패의 분류. 응답 문구와 Sentry 보고 기준이 같은 분류를 쓴다. */
type TOpenAIErrorKind = "api_key" | "quota" | "context_length" | "general";

const getOpenAIErrorKind = (error: unknown): TOpenAIErrorKind => {
	const errorMessage = error instanceof Error ? error.message : "";

	if (errorMessage.includes("API key")) {
		return "api_key";
	}

	if (errorMessage.includes("quota") || errorMessage.includes("rate_limit")) {
		return "quota";
	}

	if (errorMessage.includes("context_length_exceeded")) {
		return "context_length";
	}

	return "general";
};

const reportOpenAIServerError = createErrorReporter({
	capture: (error, context) => {
		captureException(error, context);
		// 응답을 보낸 뒤 함수가 멈춰도 이벤트가 사라지지 않도록 flush를 응답 뒤로 미룬다.
		void runAfterResponse(async () => {
			await flush(2000);
		});
	},
});

/**
 * OpenAI 호출 실패를 Sentry에 보고한다.
 *
 * @description `quota`는 비용과 직결돼 알아야 하지만 장애는 아니므로 `warning`으로 보낸다.
 * `context_length`는 사용자 페이지가 길어서 생기는 정상 흐름이라 보내지 않는다.
 * 요약은 스트리밍 안쪽에서 실패하므로 `createStreamingResponse`의 `catch`도 여기를 쓴다.
 */
export const reportOpenAIFailure = (error: unknown, feature: string): void => {
	const kind = getOpenAIErrorKind(error);

	if (kind === "context_length") {
		return;
	}

	reportOpenAIServerError({
		error,
		feature,
		operation: "openai-api",
		stage: kind,
		level: kind === "quota" ? "warning" : "error",
	});
};

/** OpenAI 오류를 보고하고 오류 종류에 맞는 HTTP 응답을 반환한다. */
export const handleOpenAIError = (error: unknown, feature: string) => {
	reportOpenAIFailure(error, feature);

	const kind = getOpenAIErrorKind(error);

	if (kind === "api_key") {
		return createErrorResponse(
			ERROR_MESSAGES.API_KEY_NOT_SET,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}

	if (kind === "quota") {
		return createErrorResponse(
			ERROR_MESSAGES.QUOTA_EXCEEDED,
			HTTP_STATUS.TOO_MANY_REQUESTS,
		);
	}

	if (kind === "context_length") {
		return createErrorResponse(
			ERROR_MESSAGES.CONTEXT_TOO_LONG,
			HTTP_STATUS.BAD_REQUEST,
		);
	}

	return createErrorResponse(
		ERROR_MESSAGES.GENERAL_SERVER_ERROR,
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
	);
};

/** 요약과 채팅 결과를 공통 SSE 형식으로 전달한다. */
export const createStreamingResponse = (
	messages: ChatCompletionMessageParam[],
	feature: string,
) => {
	const openai = new OpenAI({
		apiKey: getOpenAIApiKey(),
	});

	const encoder = new TextEncoder();

	const customReadable = new ReadableStream({
		async start(controller) {
			try {
				const stream = await openai.chat.completions.create({
					model: "gpt-6-luna",
					reasoning_effort: "none",
					messages,
					stream: true,
					temperature: 0.3,
				});

				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content;
					if (content) {
						controller.enqueue(
							encoder.encode(
								`${STREAM_DATA_PREFIX}${JSON.stringify({ content })}\n\n`,
							),
						);
					}
				}

				controller.enqueue(
					encoder.encode(`${STREAM_DATA_PREFIX}${STREAM_DONE_MARKER}\n\n`),
				);
				controller.close();
			} catch (error) {
				console.error("OpenAI API Error:", error);
				reportOpenAIFailure(error, feature);
				let errorMessage = ERROR_MESSAGES.STREAMING_ERROR as string;
				if (error instanceof Error) {
					errorMessage = error.message;
				}
				controller.enqueue(
					encoder.encode(
						`${STREAM_DATA_PREFIX}${JSON.stringify({ error: errorMessage })}\n\n`,
					),
				);
				controller.close();
			}
		},
	});

	return new Response(customReadable, {
		headers: {
			...CORS_HEADERS,
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
};
