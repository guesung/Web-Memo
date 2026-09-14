import { TOSS_PAYMENTS_API_URL } from "./config";

/** 토스 빌링키 발급 결과입니다. */
export interface IFTossBillingAuthorization {
	/** 발급된 빌링키입니다. */
	billingKey: string;
	/** 고객 식별자입니다. */
	customerKey: string;
}

/** 토스 자동결제 응답입니다. */
export interface IFTossBillingPayment {
	/** 토스 결제 식별자입니다. */
	paymentKey: string;
	/** 주문 식별자입니다. */
	orderId: string;
	/** 결제 승인 시각입니다. */
	approvedAt?: string;
	/** 결제 상태입니다. */
	status: string;
}

const getAuthorizationHeader = (): string => {
	const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

	if (!secretKey) {
		throw new Error("TOSS_PAYMENTS_SECRET_KEY is not configured");
	}

	return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
};

const requestToss = async <T>(
	path: string,
	body: Record<string, unknown>,
): Promise<T> => {
	const response = await fetch(`${TOSS_PAYMENTS_API_URL}${path}`, {
		method: "POST",
		headers: {
			Authorization: getAuthorizationHeader(),
			"Content-Type": "application/json",
			...(typeof body.orderId === "string"
				? { "Idempotency-Key": body.orderId }
				: {}),
		},
		body: JSON.stringify(body),
	});
	const responseBody = (await response.json()) as T & {
		code?: string;
		message?: string;
	};

	if (!response.ok) {
		throw Object.assign(
			new Error(`TOSS_${responseBody.code ?? "REQUEST_FAILED"}`),
			{
				httpStatus: response.status,
				isChargeRequest:
					path.startsWith("/billing/") && !path.includes("authorizations"),
			},
		);
	}

	return responseBody;
};

/** 주문 식별자로 토스 결제 결과를 조회합니다. */
export const getTossPaymentByOrderId = async (
	orderId: string,
): Promise<IFTossBillingPayment> => {
	const response = await fetch(
		`${TOSS_PAYMENTS_API_URL}/payments/orders/${encodeURIComponent(orderId)}`,
		{ headers: { Authorization: getAuthorizationHeader() } },
	);
	const responseBody = (await response.json()) as IFTossBillingPayment & {
		code?: string;
		message?: string;
	};

	if (!response.ok) {
		throw Object.assign(
			new Error(`TOSS_${responseBody.code ?? "LOOKUP_FAILED"}`),
			{
				httpStatus: response.status,
				code: responseBody.code,
				isChargeRequest: false,
			},
		);
	}

	return responseBody;
};

/** 인증키를 토스 빌링키로 교환합니다. */
export const issueTossBillingKey = async (input: {
	authKey: string;
	customerKey: string;
}): Promise<IFTossBillingAuthorization> =>
	requestToss<IFTossBillingAuthorization>(
		"/billing/authorizations/issue",
		input,
	);

/** 저장된 빌링키로 토스 자동결제를 요청합니다. */
export const chargeTossBillingKey = async (input: {
	billingKey: string;
	customerKey: string;
	amount: number;
	orderId: string;
	orderName: string;
}): Promise<IFTossBillingPayment> => {
	const { billingKey, ...requestBody } = input;

	return requestToss<IFTossBillingPayment>(
		`/billing/${billingKey}`,
		requestBody,
	);
};

/** 네트워크·서버·충돌·타임아웃 응답과 구별되는 명시적인 청구 거절인지 확인합니다. */
export const isDefinitiveTossRejection = (error: unknown): boolean => {
	if (
		!(error instanceof Error) ||
		!("httpStatus" in error) ||
		!("isChargeRequest" in error)
	) {
		return false;
	}
	const status = error.httpStatus;

	return (
		error.isChargeRequest === true &&
		typeof status === "number" &&
		status >= 400 &&
		status < 500 &&
		![408, 409, 429].includes(status)
	);
};

/** 조회 API가 해당 주문의 부재를 명시적으로 확인했는지 판별합니다. */
export const isTossOrderNotFound = (error: unknown): boolean =>
	error instanceof Error &&
	"httpStatus" in error &&
	error.httpStatus === 404 &&
	"code" in error &&
	error.code === "NOT_FOUND_PAYMENT";
