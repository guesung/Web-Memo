import type { NextRequest } from "next/server";

/** Supabase Cron 요청의 공유 비밀을 상수 시간으로 검증합니다. */
export const verifyBillingCronRequest = (request: NextRequest): boolean => {
	const expectedSecret = process.env.BILLING_CRON_SECRET;
	const providedSecret = request.headers
		.get("authorization")
		?.replace("Bearer ", "");

	if (
		!expectedSecret ||
		!providedSecret ||
		expectedSecret.length !== providedSecret.length
	) {
		return false;
	}

	let difference = 0;

	for (let index = 0; index < expectedSecret.length; index += 1) {
		difference |=
			expectedSecret.charCodeAt(index) ^ providedSecret.charCodeAt(index);
	}

	return difference === 0;
};
