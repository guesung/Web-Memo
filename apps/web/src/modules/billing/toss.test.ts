import { afterEach, describe, expect, it, vi } from "vitest";
import { chargeTossBillingKey, isDefinitiveTossRejection } from "./toss";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});
describe("Toss failure classification", () => {
	it("recognizes an explicit 400 charge rejection", async () => {
		vi.stubEnv("TOSS_PAYMENTS_SECRET_KEY", "test-secret");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ code: "REJECT_CARD_PAYMENT" }), {
					status: 400,
				}),
			),
		);
		try {
			await chargeTossBillingKey({
				billingKey: "key",
				customerKey: "customer",
				amount: 500,
				orderId: "order",
				orderName: "subscription",
			});
			expect.unreachable();
		} catch (error) {
			expect(isDefinitiveTossRejection(error)).toBe(true);
		}
	});
	it.each([408, 409, 429, 500, 502, 503])(
		"does not finalize uncertain HTTP %i as failed",
		(httpStatus) => {
			expect(
				isDefinitiveTossRejection(
					Object.assign(new Error("provider error"), {
						httpStatus,
						isChargeRequest: true,
					}),
				),
			).toBe(false);
		},
	);
	it("does not treat a failed lookup or network error as a declined charge", () => {
		expect(
			isDefinitiveTossRejection(
				Object.assign(new Error("lookup not found"), {
					httpStatus: 404,
					isChargeRequest: false,
				}),
			),
		).toBe(false);
		expect(isDefinitiveTossRejection(new Error("network timeout"))).toBe(false);
	});
});

it("uses the immutable order ID as the provider idempotency key", async () => {
	vi.stubEnv("TOSS_PAYMENTS_SECRET_KEY", "test-secret");
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(JSON.stringify({ status: "DONE" })));
	vi.stubGlobal("fetch", fetchMock);
	await chargeTossBillingKey({
		billingKey: "key",
		customerKey: "customer",
		amount: 500,
		orderId: "same-order",
		orderName: "subscription",
	});
	expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
		"same-order",
	);
});
