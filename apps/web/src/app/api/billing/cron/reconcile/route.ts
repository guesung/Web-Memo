import { verifyBillingCronRequest } from "@src/modules/billing/cron";
import { reconcileSubscriptionCharges } from "@src/modules/billing/reconcileSubscriptionCharges";
import { type NextRequest, NextResponse } from "next/server";

/** 조회 결과와 DB 저장이 모두 확인된 청구만 재조정 완료로 처리합니다. */
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
	try {
		return NextResponse.json(await reconcileSubscriptionCharges());
	} catch {
		return NextResponse.json(
			{ message: "Charge lookup failed" },
			{ status: 500 },
		);
	}
};
