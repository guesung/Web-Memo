import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "./constant";
import {
	createErrorResponse,
	createStreamingResponse,
	handleOpenAIError,
	validateMessages,
} from "./util";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { messages } = body;

		const validation = validateMessages(messages);
		if (!validation.isValid) {
			return createErrorResponse(
				validation.error || ERROR_MESSAGES.GENERAL_SERVER_ERROR,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		return createStreamingResponse(messages as ChatCompletionMessageParam[]);
	} catch (error) {
		console.error("Route handler error:", error);

		if (error instanceof Error) {
			return handleOpenAIError(error);
		}

		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
}
