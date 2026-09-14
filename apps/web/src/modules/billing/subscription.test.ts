import { beforeEach, describe, expect, it, vi } from "vitest";

/** Supabase 쿼리의 명시적 결과입니다. */
interface IFQueryResult {
	data?: unknown;
	error?: unknown;
}
const mocks = vi.hoisted(() => ({
	responses: [] as IFQueryResult[],
	writes: [] as Array<{ table: string; operation: string; value: unknown }>,
	charge: vi.fn(),
	lookup: vi.fn(),
	complete: vi.fn(),
}));
vi.mock("./admin", () => ({
	createBillingAdminClient: () => ({
		schema: () => ({
			rpc: mocks.complete,
			from: (table: string) => {
				const response = mocks.responses.shift() ?? { data: null, error: null };
				const query = {
					...response,
					select: (_columns?: string) => query,
					eq: (_column: string, _value: unknown) => query,
					in: (_column: string, _value: unknown) => query,
					gt: (_column: string, _value: unknown) => query,
					lte: (_column: string, _value: unknown) => query,
					limit: (_limit: number) => query,
					maybeSingle: () => query,
					single: () => query,
					insert: (value: unknown) => {
						mocks.writes.push({ table, operation: "insert", value });
						return query;
					},
					upsert: (value: unknown) => {
						mocks.writes.push({ table, operation: "upsert", value });
						return query;
					},
					update: (value: unknown) => {
						mocks.writes.push({ table, operation: "update", value });
						return query;
					},
				};
				return query;
			},
		}),
	}),
}));
vi.mock("./crypto", () => ({ decryptBillingKey: () => "test-key" }));
vi.mock("./toss", async (importOriginal) => {
	const original = await importOriginal<typeof import("./toss")>();

	return {
		...original,
		chargeTossBillingKey: mocks.charge,
		getTossPaymentByOrderId: mocks.lookup,
	};
});

import { completeSubscriptionCharge } from "./completeSubscriptionCharge";
import { reconcileSubscriptionCharges } from "./reconcileSubscriptionCharges";
import { chargeSubscription } from "./subscription";

beforeEach(() => {
	mocks.responses.length = 0;
	mocks.writes.length = 0;
	vi.clearAllMocks();
	mocks.complete.mockImplementation(async (name: string) => ({
		data: name === "prepare_charge_dispatch" ? "dispatch" : null,
		error: null,
	}));
});

const prepareNewCharge = () => {
	mocks.responses.push(
		{ data: null },
		{ data: null },
		{ data: null },
		{
			data: {
				toss_customer_key: "customer",
				billing_key_ciphertext: "encrypted",
			},
		},
		{ error: null },
	);
	mocks.charge.mockImplementation(async (input: { orderId: string }) => ({
		paymentKey: "payment",
		orderId: input.orderId,
		status: "DONE",
	}));
};

describe("charge persistence safeguards", () => {
	it("does not return success when subscription persistence fails", async () => {
		prepareNewCharge();
		mocks.complete.mockImplementation(async (name: string) =>
			name === "prepare_charge_dispatch"
				? { data: "dispatch" }
				: { error: new Error("subscription db failed") },
		);
		mocks.responses.push({ error: null });
		await expect(
			chargeSubscription({ userId: "user", idempotencyKey: "new" }),
		).rejects.toThrow("subscription db failed");
		expect(mocks.writes.at(-1)?.value).toMatchObject({
			status: "unknown",
			resolved_at: null,
		});
		expect(
			mocks.writes.some(
				(write) =>
					write.table === "charges" &&
					(write.value as { status?: string }).status === "succeeded",
			),
		).toBe(false);
	});
	it("does not return success when charge persistence fails", async () => {
		prepareNewCharge();
		mocks.complete.mockImplementation(async (name: string) =>
			name === "prepare_charge_dispatch"
				? { data: "dispatch" }
				: { error: new Error("charge db failed") },
		);
		mocks.responses.push({ error: null });
		await expect(
			chargeSubscription({ userId: "user", idempotencyKey: "new" }),
		).rejects.toThrow("charge db failed");
		expect(mocks.writes.at(-1)?.value).toMatchObject({ status: "unknown" });
	});
	it("blocks a new key when another charge is unknown", async () => {
		mocks.responses.push(
			{ data: null },
			{ data: { order_id: "existing", status: "unknown" } },
		);
		expect(
			await chargeSubscription({ userId: "user", idempotencyKey: "different" }),
		).toEqual({ orderId: "existing", status: "unknown" });
		expect(mocks.charge).not.toHaveBeenCalled();
		expect(mocks.writes).toHaveLength(0);
	});
	it("blocks a new key while the subscription is active", async () => {
		mocks.responses.push(
			{ data: null },
			{ data: null },
			{ data: { user_id: "user" } },
		);
		await expect(
			chargeSubscription({ userId: "user", idempotencyKey: "different" }),
		).rejects.toThrow("ACTIVE_SUBSCRIPTION_EXISTS");
		expect(mocks.charge).not.toHaveBeenCalled();
	});
	it("does not charge after a lookup failure", async () => {
		mocks.responses.push({ error: new Error("lookup failed") });
		await expect(
			chargeSubscription({ userId: "user", idempotencyKey: "new" }),
		).rejects.toThrow("lookup failed");
		expect(mocks.charge).not.toHaveBeenCalled();
	});
	it("finalizes a definitive provider decline as failed", async () => {
		prepareNewCharge();
		mocks.charge.mockRejectedValue(
			Object.assign(new Error("TOSS_REJECTED_CARD"), {
				httpStatus: 400,
				isChargeRequest: true,
			}),
		);
		mocks.responses.push({ error: null });
		expect(
			(await chargeSubscription({ userId: "user", idempotencyKey: "new" }))
				.status,
		).toBe("failed");
		expect(mocks.writes.at(-1)?.value).toMatchObject({ status: "failed" });
	});
	it("keeps network failures unresolved", async () => {
		prepareNewCharge();
		mocks.charge.mockRejectedValue(new Error("network timeout"));
		mocks.responses.push({ error: null });
		await expect(
			chargeSubscription({ userId: "user", idempotencyKey: "new" }),
		).rejects.toThrow("network timeout");
		expect(mocks.writes.at(-1)?.value).toMatchObject({ status: "unknown" });
	});
	it("uses a stable provider approval period when retrying reconciliation", async () => {
		await completeSubscriptionCharge({
			userId: "user",
			orderId: "order",
			requestedAt: "2026-09-01T00:00:00.000Z",
			payment: {
				paymentKey: "key",
				orderId: "order",
				status: "DONE",
				approvedAt: "2026-09-02T00:00:00.000Z",
			},
		});
		expect(mocks.complete).toHaveBeenCalledWith(
			"complete_subscription_charge",
			expect.objectContaining({
				target_period_start: "2026-09-02T00:00:00.000Z",
			}),
		);
	});
	it("clamps a January 31 monthly period to the last day of February", async () => {
		await completeSubscriptionCharge({
			userId: "user",
			orderId: "order",
			requestedAt: "2026-01-31T12:00:00.000Z",
			payment: { paymentKey: "key", orderId: "order", status: "DONE" },
		});
		expect(mocks.complete).toHaveBeenCalledWith(
			"complete_subscription_charge",
			expect.objectContaining({
				target_period_end: "2026-02-28T12:00:00.000Z",
			}),
		);
	});
});

describe("reconciliation persistence", () => {
	it("does not count a charge as resolved when its subscription write fails", async () => {
		mocks.responses.push({
			data: [
				{
					id: "charge",
					order_id: "order",
					user_id: "user",
					requested_at: "2026-09-01T00:00:00.000Z",
				},
			],
		});
		mocks.complete.mockResolvedValue({ error: new Error("db unavailable") });
		mocks.lookup.mockResolvedValue({
			paymentKey: "key",
			orderId: "order",
			status: "DONE",
		});
		expect(await reconcileSubscriptionCharges()).toEqual({
			processedCount: 1,
			resolvedCount: 0,
		});
		expect(mocks.writes.some((write) => write.table === "charges")).toBe(false);
	});
	it("does not convert a nonterminal provider state to failed", async () => {
		mocks.responses.push({
			data: [
				{
					id: "charge",
					order_id: "order",
					user_id: "user",
					requested_at: "2026-09-01T00:00:00.000Z",
				},
			],
		});
		mocks.lookup.mockResolvedValue({
			paymentKey: "key",
			orderId: "order",
			status: "IN_PROGRESS",
		});
		expect(await reconcileSubscriptionCharges()).toEqual({
			processedCount: 1,
			resolvedCount: 0,
		});
		expect(mocks.writes).toHaveLength(0);
	});
});

describe("safe same-order recovery", () => {
	it("replays an existing key without creating another ledger or provider charge", async () => {
		mocks.responses.push({
			data: { order_id: "same-order", status: "unknown" },
		});
		expect(
			await chargeSubscription({ userId: "user", idempotencyKey: "same-key" }),
		).toEqual({ orderId: "same-order", status: "unknown" });
		expect(mocks.charge).not.toHaveBeenCalled();
	});
	it.each(["failed", "dispatch"])(
		"recovers a missing provider order using DB dispatch state %s",
		async (dispatchState) => {
			mocks.responses.push(
				{
					data: [
						{
							id: "id",
							user_id: "user",
							order_id: "original-order",
							requested_at: "2026-09-01T00:00:00Z",
							amount_krw: 500,
						},
					],
				},
				{
					data: {
						toss_customer_key: "customer",
						billing_key_ciphertext: "encrypted",
					},
				},
			);
			mocks.lookup.mockRejectedValue(
				Object.assign(new Error("missing"), {
					httpStatus: 404,
					code: "NOT_FOUND_PAYMENT",
				}),
			);
			mocks.complete.mockImplementation(async (name: string) => ({
				data: name === "prepare_charge_dispatch" ? dispatchState : null,
				error: null,
			}));
			mocks.charge.mockResolvedValue({
				orderId: "original-order",
				paymentKey: "payment",
				status: "DONE",
			});
			expect(await reconcileSubscriptionCharges()).toEqual({
				processedCount: 1,
				resolvedCount: 1,
			});
			if (dispatchState === "dispatch") {
				expect(mocks.charge).toHaveBeenCalledWith(
					expect.objectContaining({ orderId: "original-order", amount: 500 }),
				);
			} else {
				expect(mocks.charge).not.toHaveBeenCalled();
			}
		},
	);
});
