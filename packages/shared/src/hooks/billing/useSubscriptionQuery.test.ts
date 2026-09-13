import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemoSupabaseClient } from "../../types";
import { hasPaidSubscription, requestBilling } from "./useSubscriptionQuery";

vi.mock("../supabase/queries/useSupabaseClientQuery", () => ({
	default: vi.fn(),
}));
vi.mock("../supabase/queries/useSupabaseUserQuery", () => ({
	default: vi.fn(),
}));

afterEach(() => vi.unstubAllGlobals());

describe("billing client safeguards", () => {
	it("preserves paid access after renewal cancellation until period end", () => {
		expect(
			hasPaidSubscription({
				status: "active",
				current_period_start: null,
				current_period_end: new Date(Date.now() + 60000).toISOString(),
				cancel_at_period_end: true,
				price_krw: 500,
			}),
		).toBe(true);
	});
	it("does not grant paid access for missing, unknown or expired subscriptions", () => {
		expect(hasPaidSubscription(null)).toBe(false);
		expect(
			hasPaidSubscription({
				status: "active",
				current_period_start: null,
				current_period_end: new Date(Date.now() - 60000).toISOString(),
				cancel_at_period_end: false,
				price_krw: 500,
			}),
		).toBe(false);
	});
	it("does not send unauthenticated billing requests", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const supabaseClient = {
			auth: {
				getSession: async () => ({ data: { session: null }, error: null }),
			},
		} as unknown as MemoSupabaseClient;
		await expect(
			requestBilling({ supabaseClient, path: "subscription" }),
		).rejects.toThrow("BILLING_AUTH_REQUIRED");
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it("adds the current access token without dropping the idempotency key", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
		vi.stubGlobal("fetch", fetchMock);
		const supabaseClient = {
			auth: {
				getSession: async () => ({
					data: { session: { access_token: "current-token" } },
					error: null,
				}),
			},
		} as unknown as MemoSupabaseClient;
		await requestBilling({
			supabaseClient,
			path: "subscribe",
			init: { method: "POST", headers: { "idempotency-key": "same-charge" } },
		});
		const headers = fetchMock.mock.calls[0][1].headers as Headers;
		expect(headers.get("Authorization")).toBe("Bearer current-token");
		expect(headers.get("idempotency-key")).toBe("same-charge");
		expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
	});
});
