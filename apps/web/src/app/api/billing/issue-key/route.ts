import {
	authenticateBillingRequest,
	createBillingAdminClient,
} from "@src/modules/billing";
import { encryptBillingKey } from "@src/modules/billing/crypto";
import { issueTossBillingKey } from "@src/modules/billing/toss";
import { type NextRequest, NextResponse } from "next/server";

/** 토스 인증키를 서버 전용 빌링키로 교환하고 암호화해 저장합니다. */
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

	const body = (await request.json()) as {
		authKey?: unknown;
		customerKey?: unknown;
	};

	if (
		typeof body.authKey !== "string" ||
		typeof body.customerKey !== "string"
	) {
		return NextResponse.json({ message: "Invalid request" }, { status: 400 });
	}
	const expectedCustomerKey = `webmemo_${userId.replaceAll("-", "")}`;

	if (body.customerKey !== expectedCustomerKey) {
		return NextResponse.json(
			{ message: "Invalid customer key" },
			{ status: 400 },
		);
	}

	try {
		const authorization = await issueTossBillingKey({
			authKey: body.authKey,
			customerKey: expectedCustomerKey,
		});
		const billingAdminClient = createBillingAdminClient();
		const { error } = await billingAdminClient
			.schema("billing")
			.from("customer_secrets")
			.upsert({
				user_id: userId,
				toss_customer_key: authorization.customerKey,
				billing_key_ciphertext: encryptBillingKey(authorization.billingKey),
				updated_at: new Date().toISOString(),
			});

		if (error) {
			throw error;
		}

		return NextResponse.json({ registered: true });
	} catch (error) {
		console.error("Billing key issue failed", error);

		return NextResponse.json(
			{ message: "Billing key registration failed" },
			{ status: 502 },
		);
	}
};
