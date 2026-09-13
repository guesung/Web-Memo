import { authenticateBillingRequest } from "@src/modules/billing";
import { SUBSCRIPTION_PRICE_KRW } from "@src/modules/billing/config";
import { type NextRequest, NextResponse } from "next/server";

/** 결제창에 필요한 공개 설정을 인증된 사용자에게 반환합니다. */
export const GET = async (request: NextRequest) => {
	const userId = await authenticateBillingRequest(request);

	if (!userId) {
		return NextResponse.json(
			{ message: "Authentication required" },
			{ status: 401 },
		);
	}

	const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY;
	const billingEnabled =
		process.env.BILLING_ENABLED === "true" &&
		Boolean(clientKey && process.env.TOSS_PAYMENTS_SECRET_KEY);

	return NextResponse.json({
		amount: SUBSCRIPTION_PRICE_KRW,
		currency: "KRW",
		priceVersion: "monthly-500-v1",
		customerKey: `webmemo_${userId.replaceAll("-", "")}`,
		clientKey: clientKey ?? null,
		billingEnabled,
	});
};
