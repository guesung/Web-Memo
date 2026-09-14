import {
	calculateAiCostMicros,
	reserveAiUsage,
	settleAiUsage,
} from "@src/modules/billing";
import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
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

/** 인증된 유료 사용자의 현재 페이지 기반 채팅을 스트리밍합니다. */
export const POST = async (request: NextRequest) => {
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
		const { messages, context } = body;

		const validation = validateMessages(messages);
		if (!validation.isValid) {
			return createErrorResponse(
				validation.error || ERROR_MESSAGES.GENERAL_SERVER_ERROR,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const pageContent =
			typeof context?.pageContent === "string" ? context.pageContent : "";
		const messageCharacters = (messages as ChatCompletionMessageParam[]).reduce(
			(total, message) => {
				return (
					total +
					(typeof message.content === "string"
						? new TextEncoder().encode(message.content).byteLength
						: 0)
				);
			},
			0,
		);

		const pageContentBytes = new TextEncoder().encode(pageContent).byteLength;

		if (messageCharacters + pageContentBytes > 24_000) {
			return createErrorResponse(
				ERROR_MESSAGES.CONTEXT_TOO_LONG,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const usageReservation = await reserveAiUsage(request, "chat");

		if (!usageReservation.isAllowed) {
			return createErrorResponse(
				usageReservation.message,
				usageReservation.status,
			);
		}

		const systemPrompt = buildSystemPrompt(context);
		const fullMessages: ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...(messages as ChatCompletionMessageParam[]),
		];

		const response = createStreamingResponse(fullMessages, async (usage) => {
			await settleAiUsage(
				usageReservation.reservationId,
				calculateAiCostMicros(usage),
			);
		});

		return response;
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
};

const buildSystemPrompt = (context?: ChatContext): string => {
	if (!context?.pageContent) {
		return CHAT_SYSTEM_PROMPT.DEFAULT;
	}

	return `${CHAT_SYSTEM_PROMPT.DEFAULT}${context.pageContent}`;
};

interface ChatContext {
	pageContent?: string;
}
