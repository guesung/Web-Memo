import { createBillingAdminClient } from "./admin";
import { completeSubscriptionCharge } from "./completeSubscriptionCharge";
import { dispatchSubscriptionCharge } from "./dispatchSubscriptionCharge";
import { getTossPaymentByOrderId, isTossOrderNotFound } from "./toss";

/** 오래된 pending 및 unknown 청구를 동일 주문으로 복구하며 불확실한 상태를 실패로 단정하지 않습니다. */
export const reconcileSubscriptionCharges = async () => {
	const billingSchema = createBillingAdminClient().schema("billing");
	const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
	const { data: charges, error } = await billingSchema
		.from("charges")
		.select("id,order_id,user_id,requested_at,amount_krw")
		.in("status", ["pending", "unknown"])
		.lte("requested_at", tenMinutesAgo)
		.limit(100);
	if (error) {
		throw error;
	}
	let resolvedCount = 0;
	for (const charge of charges ?? []) {
		try {
			const payment = await getTossPaymentByOrderId(charge.order_id);
			if (payment.orderId !== charge.order_id) {
				throw new Error("PAYMENT_ORDER_MISMATCH");
			}
			if (payment.status === "DONE") {
				await completeSubscriptionCharge({
					userId: charge.user_id,
					orderId: charge.order_id,
					requestedAt: charge.requested_at,
					payment,
				});
				resolvedCount += 1;
			} else if (["ABORTED", "CANCELED", "EXPIRED"].includes(payment.status)) {
				const { error: updateError } = await billingSchema
					.from("charges")
					.update({
						status: "failed",
						toss_payment_key: payment.paymentKey,
						resolved_at: new Date().toISOString(),
						raw_response: payment,
					})
					.eq("id", charge.id)
					.select("id")
					.single();
				if (updateError) {
					throw updateError;
				}
				resolvedCount += 1;
			}
		} catch (lookupError) {
			if (isTossOrderNotFound(lookupError)) {
				try {
					const { data: secret, error: secretError } = await billingSchema
						.from("customer_secrets")
						.select("toss_customer_key,billing_key_ciphertext")
						.eq("user_id", charge.user_id)
						.single();
					if (secretError || !secret) {
						throw secretError ?? new Error("BILLING_KEY_NOT_REGISTERED");
					}
					const result = await dispatchSubscriptionCharge({
						userId: charge.user_id,
						orderId: charge.order_id,
						requestedAt: charge.requested_at,
						amount: charge.amount_krw,
						secret,
						isRecovery: true,
					});
					if (["succeeded", "failed"].includes(result.status)) {
						resolvedCount += 1;
					}
				} catch (recoveryError) {
					console.error("Charge recovery remains unresolved", recoveryError);
				}
			} else {
				console.error("Charge remains unresolved", lookupError);
			}
		}
	}

	return { processedCount: charges?.length ?? 0, resolvedCount };
};
