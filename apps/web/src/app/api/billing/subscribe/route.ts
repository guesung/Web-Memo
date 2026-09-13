import { authenticateBillingRequest } from "@src/modules/billing";
import { chargeSubscription } from "@src/modules/billing/subscription";
import { type NextRequest, NextResponse } from "next/server";

/** 등록된 빌링키로 첫 구독 결제를 실행합니다. */
export const POST = async (request: NextRequest) => {
	if (process.env.BILLING_ENABLED !== "true") {
		return NextResponse.json(
			{ message: "Billing is not enabled" },
			{ status: 503 },
		);
	}
	const userId = await authenticateBillingRequest(request);

	if (!userId) {
		return NextResponse.json(
			{ message: "Authentication required" },
			{ status: 401 },
		);
	}

	const idempotencyKey = request.headers.get("idempotency-key");

	if (!idempotencyKey || idempotencyKey.length > 100) {
		return NextResponse.json(
			{ message: "A valid idempotency-key is required" },
			{ status: 400 },
		);
	}

	try {
		const result = await chargeSubscription({ userId, idempotencyKey });

		return NextResponse.json(result, {
			status: ["pending", "unknown"].includes(result.status) ? 202 : 200,
		});
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === "ACTIVE_SUBSCRIPTION_EXISTS"
		) {
			return NextResponse.json(
				{ message: "Subscription already active" },
				{ status: 409 },
			);
		}
		console.error("Subscription charge failed", error);

		return NextResponse.json(
			{ message: "Payment result is being confirmed" },
			{ status: 202 },
		);
	}
};
