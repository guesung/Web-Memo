import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	storage: new Map<string, string>(),
}));
vi.mock("react", () => ({
	useEffect: vi.fn(),
	useRef: (value: unknown) => ({ current: value }),
	useState: (value: unknown) => [value, vi.fn()],
}));
vi.mock("@tanstack/react-query", () => ({
	useMutation: (options: { mutationFn: unknown }) => ({
		mutateAsync: options.mutationFn,
	}),
	useQuery: () => ({
		data: {
			billingEnabled: true,
			amount: 500,
			currency: "KRW",
			priceVersion: "v1",
		},
	}),
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
	useSupabaseUserQuery: () => ({ data: { data: { user: { id: "user" } } } }),
}));
vi.mock("@web-memo/shared/hooks/billing", () => ({
	requestBilling: mocks.request,
	useSubscriptionQuery: () => ({ data: { latestCharge: null } }),
}));

import { useBillingActions } from "./useBillingActions";

beforeEach(() => {
	mocks.storage.clear();
	vi.clearAllMocks();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => mocks.storage.get(key) ?? null,
		setItem: (key: string, value: string) => mocks.storage.set(key, value),
		removeItem: (key: string) => mocks.storage.delete(key),
	});
});

describe("subscription request recovery", () => {
	it("resends the exact stored key after network loss and never generates a replacement", async () => {
		mocks.request.mockRejectedValueOnce(new Error("network disconnected"));
		const billing = useBillingActions("ko");
		await expect(billing.subscribeMutation.mutateAsync(false)).rejects.toThrow(
			"network disconnected",
		);
		const storedKey = mocks.storage.get("billing-pending:user");
		expect(storedKey).toBeTruthy();
		await expect(billing.subscribeMutation.mutateAsync(false)).rejects.toThrow(
			"paymentPending",
		);
		mocks.request.mockResolvedValueOnce(
			new Response(JSON.stringify({ status: "succeeded" })),
		);
		await billing.subscribeMutation.mutateAsync(true);
		expect(mocks.request.mock.calls[0][0].init.headers["idempotency-key"]).toBe(
			storedKey,
		);
		expect(mocks.request.mock.calls[1][0].init.headers["idempotency-key"]).toBe(
			storedKey,
		);
		expect(mocks.storage.has("billing-pending:user")).toBe(false);
	});
	it("does not turn retry without a stored request into a new charge", async () => {
		await expect(
			useBillingActions("ko").subscribeMutation.mutateAsync(true),
		).rejects.toThrow("paymentPending");
		expect(mocks.request).not.toHaveBeenCalled();
	});
});
