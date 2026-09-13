import {
	calculateAiCostMicros,
	reserveAiUsage,
	settleAiUsage,
} from "@src/modules/billing";
import { CHROME_EXTENSION_ID } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { ERROR_MESSAGES, HTTP_STATUS } from "./constant";
import { checkRateLimit, formatRemainingTime } from "./ratelimit";
import {
	createErrorResponse,
	createStreamingResponse,
	handleOpenAIError,
	validateMessages,
} from "./util";

const getClientIp = (request: NextRequest): string => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0].trim();
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	return "unknown";
};

/** 인증된 확장 사용자의 페이지 요약 요청을 스트리밍합니다. */
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

		const clientIp = getClientIp(request);
		const rateLimitResult = await checkRateLimit(clientIp);

		if (!rateLimitResult.success) {
			const remainingTime = formatRemainingTime(rateLimitResult.resetInSeconds);
			const errorMessage = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED.replace(
				"{time}",
				remainingTime,
			);
			return createErrorResponse(errorMessage, HTTP_STATUS.TOO_MANY_REQUESTS);
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

		const usageReservation = await reserveAiUsage(request, "summary");

		if (!usageReservation.isAllowed) {
			return createErrorResponse(
				usageReservation.message,
				usageReservation.status,
			);
		}

		const response = createStreamingResponse(
			messages as ChatCompletionMessageParam[],
			async (usage) => {
				await settleAiUsage(
					usageReservation.reservationId,
					calculateAiCostMicros(usage),
				);
			},
		);

		return response;
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
};
