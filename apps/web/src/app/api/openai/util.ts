import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import {
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import {
	CORS_HEADERS,
	ERROR_MESSAGES,
	HTTP_STATUS,
	MESSAGE_LIMITS,
} from "./constant";
import type { ValidationResult } from "./type";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Authorization 헤더의 Supabase 액세스 토큰을 검증하고 사용자 id를 돌려준다.
 * @description Origin 헤더는 브라우저 밖에서 위조할 수 있으므로,
 * OpenAI 프록시는 로그인한 사용자의 토큰 검증을 1차 방어선으로 삼는다.
 */
export const verifyAuthorization = async (
	request: NextRequest,
): Promise<{ userId: string } | null> => {
	const authHeader = request.headers.get("authorization");
	const BEARER_PREFIX = "Bearer ";

	if (!authHeader?.startsWith(BEARER_PREFIX)) return null;

	const accessToken = authHeader.slice(BEARER_PREFIX.length);
	const supabaseClient = createClient(
		CONFIG.supabaseUrl,
		CONFIG.supabaseAnonKey,
	);

	const { data, error } = await supabaseClient.auth.getUser(accessToken);
	if (error || !data.user) return null;

	return { userId: data.user.id };
};

export const validateMessages = (messages: unknown): ValidationResult => {
	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return { isValid: false, error: ERROR_MESSAGES.MISSING_MESSAGES };
	}

	if (messages.length > MESSAGE_LIMITS.maxCount) {
		return { isValid: false, error: ERROR_MESSAGES.CONTEXT_TOO_LONG };
	}

	const isValidMessage = messages.every((msg: unknown) => {
		if (!msg || typeof msg !== "object") return false;
		const message = msg as Record<string, unknown>;
		return (
			typeof message.role === "string" &&
			typeof message.content === "string" &&
			message.content.length <= MESSAGE_LIMITS.maxContentLength
		);
	});

	if (!isValidMessage) {
		return { isValid: false, error: ERROR_MESSAGES.INVALID_MESSAGE_FORMAT };
	}

	return { isValid: true };
};

export const createErrorResponse = (error: string, status: number) => {
	return NextResponse.json({ error }, { status, headers: CORS_HEADERS });
};

export const handleOpenAIError = (error: Error) => {
	const errorMessage = error.message;

	if (errorMessage.includes("API key")) {
		return createErrorResponse(
			ERROR_MESSAGES.API_KEY_NOT_SET,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}

	const isQuotaError =
		errorMessage.includes("quota") || errorMessage.includes("rate_limit");
	if (isQuotaError) {
		return createErrorResponse(
			ERROR_MESSAGES.QUOTA_EXCEEDED,
			HTTP_STATUS.TOO_MANY_REQUESTS,
		);
	}

	if (errorMessage.includes("context_length_exceeded")) {
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

export const createStreamingResponse = (
	messages: ChatCompletionMessageParam[],
) => {
	const openai = new OpenAI({
		apiKey: OPENAI_API_KEY,
	});

	const encoder = new TextEncoder();

	const customReadable = new ReadableStream({
		async start(controller) {
			try {
				const stream = await openai.chat.completions.create({
					model: "gpt-4o-mini",
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
