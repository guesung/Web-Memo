import { createBillingAdminClient } from "./admin";
import type { IFTossBillingPayment } from "./toss";

/** 결제가 완료된 원장과 구독을 저장하기 위한 입력입니다. */
interface IFCompleteSubscriptionChargeInput {
	userId: string;
	orderId: string;
	requestedAt: string;
	payment: IFTossBillingPayment;
}

/** 동일 사용자 청구 시작과 직렬화된 DB 트랜잭션으로 구독·원장을 함께 확정합니다. */
export const completeSubscriptionCharge = async (
	input: IFCompleteSubscriptionChargeInput,
): Promise<void> => {
	if (
		input.payment.status !== "DONE" ||
		input.payment.orderId !== input.orderId
	) {
		throw new Error("PAYMENT_NOT_CONFIRMED");
	}
	const periodStart = new Date(input.payment.approvedAt ?? input.requestedAt);
	if (Number.isNaN(periodStart.getTime())) {
		throw new Error("PAYMENT_PERIOD_INVALID");
	}
	const periodEnd = new Date(periodStart);
	const originalDay = periodEnd.getUTCDate();
	periodEnd.setUTCDate(1);
	periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
	const finalDay = new Date(
		Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 0),
	).getUTCDate();
	periodEnd.setUTCDate(Math.min(originalDay, finalDay));
	const { error } = await createBillingAdminClient()
		.schema("billing")
		.rpc("complete_subscription_charge", {
			target_user_id: input.userId,
			target_order_id: input.orderId,
			target_period_start: periodStart.toISOString(),
			target_period_end: periodEnd.toISOString(),
			target_payment_key: input.payment.paymentKey,
			target_payment: input.payment,
		});
	if (error) {
		throw error;
	}
};
