import { randomUUID } from "node:crypto";
import { createBillingAdminClient } from "./admin";
import { SUBSCRIPTION_PRICE_KRW } from "./config";
import { dispatchSubscriptionCharge } from "./dispatchSubscriptionCharge";

/** 구독 청구 요청에 필요한 사용자 정보입니다. */
export interface IFChargeSubscriptionInput {
	/** 청구할 사용자 ID입니다. */
	userId: string;
	/** 재시도에서 재사용할 멱등성 키입니다. */
	idempotencyKey: string;
}

/** 기존 청구·활성 기간을 확인하고 DB 원장 확보 후에만 토스에 청구합니다. */
export const chargeSubscription = async (
	input: IFChargeSubscriptionInput,
): Promise<{ orderId: string; status: string }> => {
	const billingSchema = createBillingAdminClient().schema("billing");
	const { data: existingCharge, error: existingChargeError } =
		await billingSchema
			.from("charges")
			.select("order_id,status")
			.eq("user_id", input.userId)
			.eq("idempotency_key", input.idempotencyKey)
			.maybeSingle();
	if (existingChargeError) {
		throw existingChargeError;
	}
	if (existingCharge) {
		return { orderId: existingCharge.order_id, status: existingCharge.status };
	}
	const { data: pendingCharge, error: pendingChargeError } = await billingSchema
		.from("charges")
		.select("order_id,status")
		.eq("user_id", input.userId)
		.in("status", ["pending", "unknown"])
		.limit(1)
		.maybeSingle();
	if (pendingChargeError) {
		throw pendingChargeError;
	}
	if (pendingCharge) {
		return { orderId: pendingCharge.order_id, status: pendingCharge.status };
	}
	const { data: subscription, error: subscriptionError } = await billingSchema
		.from("subscriptions")
		.select("user_id")
		.eq("user_id", input.userId)
		.eq("status", "active")
		.gt("current_period_end", new Date().toISOString())
		.maybeSingle();
	if (subscriptionError) {
		throw subscriptionError;
	}
	if (subscription) {
		throw new Error("ACTIVE_SUBSCRIPTION_EXISTS");
	}
	const { data: secret, error: secretError } = await billingSchema
		.from("customer_secrets")
		.select("toss_customer_key,billing_key_ciphertext")
		.eq("user_id", input.userId)
		.single();
	if (secretError || !secret) {
		throw new Error("BILLING_KEY_NOT_REGISTERED");
	}
	const orderId = `webmemo-${randomUUID()}`;
	const requestedAt = new Date().toISOString();
	const { error: insertError } = await billingSchema.from("charges").insert({
		user_id: input.userId,
		order_id: orderId,
		idempotency_key: input.idempotencyKey,
		amount_krw: SUBSCRIPTION_PRICE_KRW,
		status: "pending",
		requested_at: requestedAt,
	});
	if (insertError) {
		if (insertError.message.includes("ACTIVE_SUBSCRIPTION_EXISTS")) {
			throw new Error("ACTIVE_SUBSCRIPTION_EXISTS");
		}
		if (insertError.code === "23505") {
			const { data: concurrentCharge, error: concurrentError } =
				await billingSchema
					.from("charges")
					.select("order_id,status")
					.eq("user_id", input.userId)
					.in("status", ["pending", "unknown"])
					.limit(1)
					.maybeSingle();
			if (!concurrentError && concurrentCharge) {
				return {
					orderId: concurrentCharge.order_id,
					status: concurrentCharge.status,
				};
			}
		}
		throw insertError;
	}
	return dispatchSubscriptionCharge({
		userId: input.userId,
		orderId,
		requestedAt,
		amount: SUBSCRIPTION_PRICE_KRW,
		secret,
		isRecovery: false,
	});
};
