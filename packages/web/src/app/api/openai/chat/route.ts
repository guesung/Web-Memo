import { EXTENSION } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import {
	createErrorResponse,
	createStreamingResponse,
	handleOpenAIError,
	validateMessages,
} from "../util";
import { CHAT_SYSTEM_PROMPT } from "./constant";

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
		const { messages, context } = body;

		const validation = validateMessages(messages);
		if (!validation.isValid) {
			return createErrorResponse(
				validation.error || ERROR_MESSAGES.GENERAL_SERVER_ERROR,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const systemPrompt = buildSystemPrompt(context);
		const fullMessages: ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...(messages as ChatCompletionMessageParam[]),
		];

		return createStreamingResponse(fullMessages);
	} catch (error) {
		console.error("Chat route handler error:", error);

		if (error instanceof Error) {
			return handleOpenAIError(error);
		}

		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}

function buildSystemPrompt(context?: ChatContext): string {
	if (!context?.pageContent) {
		return CHAT_SYSTEM_PROMPT.DEFAULT;
	}

	const contentType =
		context.category === "youtube"
			? CHAT_SYSTEM_PROMPT.YOUTUBE_CONTEXT
			: CHAT_SYSTEM_PROMPT.WEB_CONTEXT;

	return `${CHAT_SYSTEM_PROMPT.DEFAULT}

${contentType}

<content>
${context.pageContent}
</content>

${context.summary ? `<summary>\n${context.summary}\n</summary>` : ""}`;
}

interface ChatContext {
	pageContent?: string;
	summary?: string;
	category?: "youtube" | "others";
}
