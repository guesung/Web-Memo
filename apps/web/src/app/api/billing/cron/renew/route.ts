import { createBillingAdminClient } from "@src/modules/billing";
import { verifyBillingCronRequest } from "@src/modules/billing/cron";
import { chargeSubscription } from "@src/modules/billing/subscription";
import { type NextRequest, NextResponse } from "next/server";

/** 만료된 활성 구독을 멱등적으로 재청구합니다. */
export const POST = async (request: NextRequest) => {
	if (process.env.BILLING_ENABLED !== "true") {
		return NextResponse.json(
			{ message: "Billing is not enabled" },
			{ status: 503 },
		);
	}
	if (!verifyBillingCronRequest(request)) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const billingSchema = createBillingAdminClient().schema("billing");
	const now = new Date().toISOString();
	const { data: subscriptions, error } = await billingSchema
		.from("subscriptions")
		.select("user_id,current_period_end,cancel_at_period_end")
		.eq("status", "active")
		.eq("cancel_at_period_end", false)
		.lte("current_period_end", now)
		.limit(100);

	if (error) {
		return NextResponse.json(
			{ message: "Subscription lookup failed" },
			{ status: 500 },
		);
	}

	let renewedCount = 0;

	for (const subscription of subscriptions ?? []) {
		if (subscription.cancel_at_period_end) {
			continue;
		}

		try {
			const result = await chargeSubscription({
				userId: subscription.user_id,
				idempotencyKey: `renew:${subscription.user_id}:${subscription.current_period_end}`,
			});

			if (result.status === "succeeded") {
				renewedCount += 1;
			}
		} catch (renewalError) {
			console.error("Subscription renewal needs reconciliation", renewalError);
		}
	}

	return NextResponse.json({
		processedCount: subscriptions?.length ?? 0,
		renewedCount,
	});
};
