import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	authenticate: vi.fn(),
	createAdmin: vi.fn(),
	charge: vi.fn(),
	reconcile: vi.fn(),
	verifyCron: vi.fn(),
}));
vi.mock("@src/modules/billing", () => ({
	authenticateBillingRequest: mocks.authenticate,
	createBillingAdminClient: mocks.createAdmin,
}));
vi.mock("@src/modules/billing/subscription", () => ({
	chargeSubscription: mocks.charge,
}));
vi.mock("@src/modules/billing/reconcileSubscriptionCharges", () => ({
	reconcileSubscriptionCharges: mocks.reconcile,
}));
vi.mock("@src/modules/billing/cron", () => ({
	verifyBillingCronRequest: mocks.verifyCron,
}));
vi.mock("@src/modules/billing/crypto", () => ({ encryptBillingKey: vi.fn() }));
vi.mock("@src/modules/billing/toss", () => ({ issueTossBillingKey: vi.fn() }));

import { POST as reconcile } from "./cron/reconcile/route";
import { POST as renew } from "./cron/renew/route";
import { POST as issueKey } from "./issue-key/route";
import { POST as subscribe } from "./subscribe/route";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});
describe("billing server rollout guard", () => {
	it.each([subscribe, issueKey, renew, reconcile])(
		"returns 503 before any database or provider call while disabled",
		async (handler) => {
			vi.stubEnv("BILLING_ENABLED", "false");
			const response = await handler(
				new NextRequest("https://example.com/api/billing", { method: "POST" }),
			);
			expect(response.status).toBe(503);
			expect(mocks.createAdmin).not.toHaveBeenCalled();
			expect(mocks.charge).not.toHaveBeenCalled();
			expect(mocks.reconcile).not.toHaveBeenCalled();
		},
	);
	it("returns 409 when a new subscription request targets an active subscription", async () => {
		vi.stubEnv("BILLING_ENABLED", "true");
		mocks.authenticate.mockResolvedValue("user");
		mocks.charge.mockRejectedValue(new Error("ACTIVE_SUBSCRIPTION_EXISTS"));
		const response = await subscribe(
			new NextRequest("https://example.com/api/billing/subscribe", {
				method: "POST",
				headers: { "idempotency-key": "new-key" },
			}),
		);
		expect(response.status).toBe(409);
	});
	it("returns 202 rather than success for an unresolved existing charge", async () => {
		vi.stubEnv("BILLING_ENABLED", "true");
		mocks.authenticate.mockResolvedValue("user");
		mocks.charge.mockResolvedValue({ orderId: "old-order", status: "unknown" });
		const response = await subscribe(
			new NextRequest("https://example.com/api/billing/subscribe", {
				method: "POST",
				headers: { "idempotency-key": "new-key" },
			}),
		);
		expect(response.status).toBe(202);
	});
});
