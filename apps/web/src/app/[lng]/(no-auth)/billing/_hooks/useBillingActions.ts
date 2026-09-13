import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	useSupabaseClientQuery,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import {
	requestBilling,
	useSubscriptionQuery,
} from "@web-memo/shared/hooks/billing";
import { useEffect, useRef, useState } from "react";

/** 서버에서 공개를 허용한 결제 설정입니다. */
interface IFBillingConfig {
	amount: number;
	currency: string;
	customerKey: string;
	billingEnabled: boolean;
	clientKey: string | null;
	priceVersion: string;
}
/** 토스 v2 자동결제 인증에 사용하는 최소 SDK 계약입니다. */
interface IFTossWindow extends Window {
	TossPayments?: (clientKey: string) => {
		payment: (input: { customerKey: string }) => {
			requestBillingAuth: (input: {
				method: "CARD";
				successUrl: string;
				failUrl: string;
			}) => Promise<void>;
		};
	};
}

/** 카드 인증·결제·해지를 분리하고 불확실한 청구의 멱등성 키를 보존합니다. */
export const useBillingActions = (language: string) => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { data: userResponse } = useSupabaseUserQuery();
	const userId = userResponse.data.user?.id;
	const subscriptionQuery = useSubscriptionQuery();
	const queryClient = useQueryClient();
	const [isCardRegistered, setIsCardRegistered] = useState(false);
	const [isPaymentUnknown, setIsPaymentUnknown] = useState(false);
	const [callbackStatus, setCallbackStatus] = useState<
		"none" | "received" | "failed"
	>("none");
	const callbackRef = useRef<{ authKey: string; customerKey: string } | null>(
		null,
	);
	const configQuery = useQuery({
		queryKey: ["billing", "config", userId],
		enabled: !!userId,
		retry: false,
		queryFn: async (): Promise<IFBillingConfig> => {
			const response = await requestBilling({ supabaseClient, path: "config" });
			if (!response.ok) {
				throw new Error("billingUnavailable");
			}

			return response.json();
		},
	});
	useEffect(() => {
		const search = new URLSearchParams(window.location.search);
		const authKey = search.get("authKey");
		const customerKey = search.get("customerKey");
		if (authKey && customerKey) {
			callbackRef.current = { authKey, customerKey };
			setCallbackStatus("received");
		} else if (search.has("code")) {
			setCallbackStatus("failed");
		}
		if (authKey || search.has("code")) {
			window.history.replaceState(null, "", window.location.pathname);
		}
	}, []);
	useEffect(() => {
		if (userId) {
			setIsPaymentUnknown(!!localStorage.getItem(`billing-pending:${userId}`));
		}
	}, [userId]);
	useEffect(() => {
		const handleStorageChange = () => {
			if (userId) {
				setIsPaymentUnknown(
					!!localStorage.getItem(`billing-pending:${userId}`),
				);
			}
		};
		window.addEventListener("storage", handleStorageChange);

		return () => window.removeEventListener("storage", handleStorageChange);
	}, [userId]);
	const refreshBilling = async () => {
		await queryClient.invalidateQueries({ queryKey: ["billing"] });
	};
	const registerCardMutation = useMutation({
		mutationFn: async () => {
			const config = configQuery.data;
			if (!config?.billingEnabled || !config.clientKey || !userId) {
				throw new Error("billingUnavailable");
			}
			if (
				isPaymentUnknown ||
				["pending", "unknown"].includes(
					subscriptionQuery.data?.latestCharge?.status ?? "",
				)
			) {
				throw new Error("paymentPending");
			}
			const tossPayments = (window as IFTossWindow).TossPayments;
			if (!tossPayments) {
				throw new Error("sdkUnavailable");
			}
			const payment = tossPayments(config.clientKey).payment({
				customerKey: config.customerKey,
			});
			const resultUrl = `${window.location.origin}/${language}/billing/result`;
			await payment.requestBillingAuth({
				method: "CARD",
				successUrl: resultUrl,
				failUrl: resultUrl,
			});
		},
	});
	const issueKeyMutation = useMutation({
		mutationFn: async () => {
			if (!callbackRef.current) {
				throw new Error("registrationFailed");
			}
			const response = await requestBilling({
				supabaseClient,
				path: "issue-key",
				init: { method: "POST", body: JSON.stringify(callbackRef.current) },
			});
			if (!response.ok) {
				throw new Error("registrationFailed");
			}
			callbackRef.current = null;
			setCallbackStatus("none");
			setIsCardRegistered(true);
			await refreshBilling();
		},
	});
	const subscribeMutation = useMutation({
		mutationFn: async (retryPending: boolean = false) => {
			if (!userId) {
				throw new Error("paymentPending");
			}
			const storedKey = localStorage.getItem(`billing-pending:${userId}`);
			if (
				retryPending
					? !storedKey
					: storedKey ||
						isPaymentUnknown ||
						["pending", "unknown"].includes(
							subscriptionQuery.data?.latestCharge?.status ?? "",
						)
			) {
				throw new Error("paymentPending");
			}

			if (
				!configQuery.data?.billingEnabled ||
				configQuery.data.amount !== 500 ||
				configQuery.data.currency !== "KRW"
			) {
				throw new Error("billingUnavailable");
			}
			const idempotencyKey = storedKey ?? crypto.randomUUID();
			localStorage.setItem(`billing-pending:${userId}`, idempotencyKey);
			setIsPaymentUnknown(true);
			try {
				const response = await requestBilling({
					supabaseClient,
					path: "subscribe",
					init: {
						method: "POST",
						headers: { "idempotency-key": idempotencyKey },
						body: JSON.stringify({
							consent: true,
							amount: 500,
							priceVersion: configQuery.data?.priceVersion,
						}),
					},
				});
				const result = await response.json();
				if (
					[400, 401, 403, 503].includes(response.status) ||
					(response.status === 409 &&
						result.message === "Subscription already active")
				) {
					localStorage.removeItem(`billing-pending:${userId}`);
					setIsPaymentUnknown(false);
					throw new Error("billingUnavailable");
				}
				if (
					response.ok &&
					response.status !== 202 &&
					result.status === "succeeded"
				) {
					localStorage.removeItem(`billing-pending:${userId}`);
					setIsPaymentUnknown(false);
				}
			} finally {
				await refreshBilling();
			}
		},
	});
	const cancelMutation = useMutation({
		mutationFn: async () => {
			const response = await requestBilling({
				supabaseClient,
				path: "subscription",
				init: { method: "DELETE" },
			});
			if (!response.ok) {
				throw new Error("cancellationFailed");
			}
			await refreshBilling();
		},
	});
	useEffect(() => {
		const chargeStatus = subscriptionQuery.data?.latestCharge?.status;
		if (
			userId &&
			(chargeStatus === "succeeded" || chargeStatus === "failed") &&
			subscriptionQuery.data?.latestCharge?.idempotency_key ===
				localStorage.getItem(`billing-pending:${userId}`)
		) {
			localStorage.removeItem(`billing-pending:${userId}`);
			setIsPaymentUnknown(false);
		}
	}, [
		userId,
		subscriptionQuery.data?.latestCharge?.status,
		subscriptionQuery.data?.latestCharge?.idempotency_key,
	]);
	const hasUnresolvedPayment =
		isPaymentUnknown ||
		["pending", "unknown"].includes(
			subscriptionQuery.data?.latestCharge?.status ?? "",
		);

	return {
		userId,
		subscriptionQuery,
		configQuery,
		isCardRegistered: isCardRegistered || subscriptionQuery.data?.hasBillingKey,
		callbackStatus,
		hasUnresolvedPayment,
		canRetryPendingPayment: isPaymentUnknown,
		registerCardMutation,
		issueKeyMutation,
		subscribeMutation,
		cancelMutation,
		refreshBilling,
	};
};
