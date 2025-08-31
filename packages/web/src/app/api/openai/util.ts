import { CONFIG } from "@web-memo/env";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import {
	CORS_HEADERS,
	ERROR_MESSAGES,
	HTTP_STATUS,
	OPENAI_MODEL,
	OPENAI_TEMPERATURE,
	STREAM_DONE_MARKER,
} from "./constant";
import type { ValidationResult } from "./type";

const openai = new OpenAI({
	apiKey: CONFIG.openApiKey,
});

// Validation functions
export const validateMessages = (messages: unknown): ValidationResult => {
	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return { isValid: false, error: ERROR_MESSAGES.MISSING_MESSAGES };
	}

	const isValidMessage = messages.every((msg: unknown) => {
		if (!msg || typeof msg !== "object") return false;
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

// Error handling functions
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

// Streaming functions
export const createStreamingResponse = (
	messages: ChatCompletionMessageParam[],
) => {
	const encoder = new TextEncoder();

	const customReadable = new ReadableStream({
		async start(controller) {
			try {
				const stream = await openai.chat.completions.create({
					model: OPENAI_MODEL,
					messages,
					stream: true,
					temperature: OPENAI_TEMPERATURE,
				});

				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content;
					if (content) {
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
						);
					}
				}

				controller.enqueue(encoder.encode(STREAM_DONE_MARKER));
				controller.close();
			} catch (error) {
				console.error("OpenAI API Error:", error);
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({ error: ERROR_MESSAGES.STREAMING_ERROR })}\n\n`,
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
