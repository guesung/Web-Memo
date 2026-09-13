import {
	authenticateBillingRequest,
	createBillingAdminClient,
} from "@src/modules/billing";
import { type NextRequest, NextResponse } from "next/server";

/** 현재 사용자의 구독 상태와 AI 주기 사용량을 반환합니다. */
export const GET = async (request: NextRequest) => {
	const userId = await authenticateBillingRequest(request);

	if (!userId) {
		return NextResponse.json(
			{ message: "Authentication required" },
			{ status: 401 },
		);
	}

	const billingSchema = createBillingAdminClient().schema("billing");
	const { data: subscription, error: subscriptionError } = await billingSchema
		.from("subscriptions")
		.select(
			"status,current_period_start,current_period_end,cancel_at_period_end,price_krw",
		)
		.eq("user_id", userId)
		.maybeSingle();
	const { data: latestCharge, error: latestChargeError } = await billingSchema
		.from("charges")
		.select(
			"order_id,idempotency_key,status,requested_at,resolved_at,failure_message",
		)
		.eq("user_id", userId)
		.order("requested_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	const { data: billingSecret, error: billingSecretError } = await billingSchema
		.from("customer_secrets")
		.select("user_id")
		.eq("user_id", userId)
		.maybeSingle();
	let aiUsageCount = 0;
	const { count: memoCount, error: memoCountError } =
		await createBillingAdminClient()
			.schema("memo")
			.from("memo")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId);

	if (
		subscriptionError ||
		latestChargeError ||
		billingSecretError ||
		memoCountError
	) {
		return NextResponse.json(
			{ message: "Subscription state is temporarily unavailable" },
			{ status: 503 },
		);
	}

	if (subscription?.current_period_start && subscription.current_period_end) {
		const { count, error: aiUsageError } = await billingSchema
			.from("ai_usage")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.eq("period_start", subscription.current_period_start)
			.eq("period_end", subscription.current_period_end)
			.neq("status", "released");
		if (aiUsageError) {
			return NextResponse.json(
				{ message: "Subscription state is temporarily unavailable" },
				{ status: 503 },
			);
		}

		aiUsageCount = count ?? 0;
	}

	return NextResponse.json({
		subscription,
		latestCharge,
		hasBillingKey: Boolean(billingSecret),
		memoCount: memoCount ?? 0,
		memoLimit: 50,
		aiUsageCount,
		aiUsageLimit: 30,
	});
};

/** 구독을 즉시 삭제하지 않고 현재 주기 만료 시점에 해지합니다. */
export const DELETE = async (request: NextRequest) => {
	const userId = await authenticateBillingRequest(request);

	if (!userId) {
		return NextResponse.json(
			{ message: "Authentication required" },
			{ status: 401 },
		);
	}

	const { error } = await createBillingAdminClient()
		.schema("billing")
		.rpc("cancel_subscription", { target_user_id: userId });

	if (error) {
		return NextResponse.json(
			{ message: "Cancellation failed" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ cancelAtPeriodEnd: true });
};
