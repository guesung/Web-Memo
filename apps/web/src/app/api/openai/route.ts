import { EXTENSION } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { ERROR_MESSAGES, HTTP_STATUS } from "./constant";
import {
	createErrorResponse,
	createStreamingResponse,
	handleOpenAIError,
	validateMessages,
} from "./util";

export const runtime = "edge";

export async function POST(request: NextRequest) {
	try {
		const origin = request.headers.get("origin");
		const validOrigin = `chrome-extension://${EXTENSION.id}`;

		if (origin !== validOrigin) {
			return createErrorResponse(
				ERROR_MESSAGES.UNAUTHORIZED,
				HTTP_STATUS.FORBIDDEN,
			);
		}

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
