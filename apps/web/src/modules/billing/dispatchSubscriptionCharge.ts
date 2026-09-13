import { createBillingAdminClient } from "./admin";
import { completeSubscriptionCharge } from "./completeSubscriptionCharge";
import { decryptBillingKey } from "./crypto";
import { chargeTossBillingKey, isDefinitiveTossRejection } from "./toss";

/** 원장에 확보한 불변 주문 정보와 서버 전용 빌링키입니다. */
interface IFDispatchSubscriptionChargeInput {
	userId: string;
	orderId: string;
	requestedAt: string;
	amount: number;
	secret: { billing_key_ciphertext: string; toss_customer_key: string };
	isRecovery: boolean;
}

/** DB에서 발송 가능 여부를 확정한 뒤 항상 동일 주문·토스 멱등성 키로 청구합니다. */
export const dispatchSubscriptionCharge = async (
	input: IFDispatchSubscriptionChargeInput,
) => {
	const billingSchema = createBillingAdminClient().schema("billing");
	const { data: dispatchStatus, error: dispatchError } =
		await billingSchema.rpc("prepare_charge_dispatch", {
			target_user_id: input.userId,
			target_order_id: input.orderId,
			target_recovery: input.isRecovery,
		});
	if (dispatchError) {
		throw dispatchError;
	}
	if (dispatchStatus !== "dispatch") {
		return {
			orderId: input.orderId,
			status: String(dispatchStatus ?? "unknown"),
		};
	}
	try {
		const payment = await chargeTossBillingKey({
			billingKey: decryptBillingKey(input.secret.billing_key_ciphertext),
			customerKey: input.secret.toss_customer_key,
			amount: input.amount,
			orderId: input.orderId,
			orderName: "Web Memo Pro 1개월",
		});
		await completeSubscriptionCharge({
			userId: input.userId,
			orderId: input.orderId,
			requestedAt: input.requestedAt,
			payment,
		});

		return { orderId: input.orderId, status: "succeeded" };
	} catch (error) {
		const isRejected = isDefinitiveTossRejection(error);
		const { error: persistenceError } = await billingSchema
			.from("charges")
			.update({
				status: isRejected ? "failed" : "unknown",
				failure_message:
					error instanceof Error ? error.message : "Charge persistence failed",
				resolved_at: isRejected ? new Date().toISOString() : null,
			})
			.eq("order_id", input.orderId)
			.in("status", ["pending", "unknown"]);
		if (persistenceError) {
			console.error(
				"Charge remains pending for reconciliation",
				persistenceError,
			);
		}
		if (isRejected && !persistenceError) {
			return { orderId: input.orderId, status: "failed" };
		}
		throw error;
	}
};
