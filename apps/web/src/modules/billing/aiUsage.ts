import type { NextRequest } from "next/server";
import { createBillingAdminClient } from "./admin";
import { authenticateBillingRequest } from "./auth";
import { AI_RESERVATION_COST_MICROS } from "./config";

/** AI 사용량 예약 결과입니다. */
export type TAiUsageReservationResult =
	| { isAllowed: true; userId: string; reservationId: string }
	| { isAllowed: false; status: number; message: string };

/** 인증·구독·AI 주기 한도를 원자적으로 검증하고 비용을 예약합니다. */
export const reserveAiUsage = async (
	request: NextRequest,
	feature: string,
): Promise<TAiUsageReservationResult> => {
	const exchangeRate = Number(process.env.OPENAI_USD_TO_KRW_RATE);

	if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
		return {
			isAllowed: false,
			status: 503,
			message: "AI cost configuration is unavailable",
		};
	}

	const userId = await authenticateBillingRequest(request);

	if (!userId) {
		return {
			isAllowed: false,
			status: 401,
			message: "Authentication required",
		};
	}

	const billingAdminClient = createBillingAdminClient();
	const maximumRequestCostMicros = calculateAiCostMicros({
		promptTokens: 24_000,
		completionTokens: 1_000,
	});
	const { data, error } = await billingAdminClient
		.schema("billing")
		.rpc("reserve_ai_usage", {
			target_user_id: userId,
			target_feature: feature,
			target_estimated_cost_micros: Math.max(
				AI_RESERVATION_COST_MICROS,
				maximumRequestCostMicros,
			),
		});

	if (error || typeof data !== "string") {
		return {
			isAllowed: false,
			status: error?.message.includes("ACTIVE_SUBSCRIPTION_REQUIRED")
				? 402
				: 429,
			message: error?.message ?? "AI usage could not be reserved",
		};
	}

	return { isAllowed: true, userId, reservationId: data };
};

/** AI 호출이 시작된 예약을 예상 비용으로 확정합니다. */
export const settleAiUsage = async (
	reservationId: string,
	actualCostMicros = AI_RESERVATION_COST_MICROS,
): Promise<void> => {
	const billingAdminClient = createBillingAdminClient();
	const { error } = await billingAdminClient
		.schema("billing")
		.rpc("settle_ai_usage", {
			target_reservation_id: reservationId,
			target_actual_cost_micros: actualCostMicros,
		});

	if (error) {
		console.error("AI usage settlement failed", error);
	}
};

/** GPT-4o mini 토큰 사용량을 원화 마이크로 단위 비용으로 변환합니다. */
export const calculateAiCostMicros = (input: {
	promptTokens: number;
	completionTokens: number;
}): number => {
	const exchangeRate = Number(process.env.OPENAI_USD_TO_KRW_RATE);

	if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
		return AI_RESERVATION_COST_MICROS;
	}

	const inputCostMicros = input.promptTokens * 0.15 * exchangeRate;
	const outputCostMicros = input.completionTokens * 0.6 * exchangeRate;

	return Math.max(0, Math.ceil(inputCostMicros + outputCostMicros));
};
