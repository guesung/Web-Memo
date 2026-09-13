import { useQuery } from "@tanstack/react-query";
import type { MemoSupabaseClient } from "../../types";
import useSupabaseClientQuery from "../supabase/queries/useSupabaseClientQuery";
import useSupabaseUserQuery from "../supabase/queries/useSupabaseUserQuery";

/** 서버에서 확인한 구독과 공용 AI 사용량입니다. */
export interface IFSubscriptionResponse {
	subscription: {
		status: string;
		current_period_start: string | null;
		current_period_end: string | null;
		cancel_at_period_end: boolean;
		price_krw: number;
	} | null;
	aiUsageCount: number;
	aiUsageLimit: number;
	memoCount?: number;
	memoLimit?: number;
	latestCharge?: {
		status: string;
		order_id: string;
		idempotency_key?: string;
	} | null;
	hasBillingKey?: boolean;
}

/** 인증된 청구 API 요청입니다. 비밀 키는 클라이언트에서 취급하지 않습니다. */
export const requestBilling = async (input: {
	supabaseClient: MemoSupabaseClient;
	baseUrl?: string;
	path: string;
	init?: RequestInit;
}) => {
	const { data, error } = await input.supabaseClient.auth.getSession();
	if (error || !data.session) {
		throw new Error("BILLING_AUTH_REQUIRED");
	}
	const headers = new Headers(input.init?.headers);
	headers.set("Authorization", `Bearer ${data.session.access_token}`);
	headers.set("Content-Type", "application/json");

	return fetch(`${input.baseUrl ?? ""}/api/billing/${input.path}`, {
		...input.init,
		headers,
		cache: "no-store",
	});
};

/** 결제/해지 이후에도 기결제 이용 기간이 남아 있는지 확인합니다. */
export const hasPaidSubscription = (
	subscription: IFSubscriptionResponse["subscription"],
) => {
	if (!subscription?.current_period_end || subscription.status !== "active") {
		return false;
	}

	return Date.parse(subscription.current_period_end) > Date.now();
};

/** 사용자별 구독 상태를 조회하며 실패를 무료 상태로 바꾸지 않습니다. */
export const useSubscriptionQuery = (baseUrl = "") => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { data: userResponse } = useSupabaseUserQuery();
	const userId = userResponse.data.user?.id;

	return useQuery({
		queryKey: ["billing", "subscription", userId],
		enabled: !!userId,
		queryFn: async (): Promise<IFSubscriptionResponse> => {
			const response = await requestBilling({
				supabaseClient,
				baseUrl,
				path: "subscription",
			});
			if (!response.ok) {
				throw new Error("BILLING_STATUS_UNAVAILABLE");
			}

			return response.json();
		},
		staleTime: 0,
		retry: false,
		refetchOnWindowFocus: true,
	});
};
