import { describe, expect, it, vi } from "vitest";

import {
	computeBackoffMs,
	createIngestClient,
	INGEST_SECRET_HEADER,
	IngestError,
	isStaleLeaseError,
} from "./ingestClient.mjs";

const SECRET = "unit-test-secret-value-000000000000";
const LEASE = { blogId: "toss", generation: 1, leaseToken: "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c" };

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("createIngestClient", () => {
	it("secret 헤더와 JSON 본문으로 POST한다", async () => {
		const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(200, { accepted: 1 }));
		const client = createIngestClient({ url: "https://example.test/ingest", secret: SECRET, fetchImpl, sleep: async () => {} });

		await client.batch({ ...LEASE, items: [{ providerId: "1" }] });

		const [url, init] = fetchImpl.mock.calls[0];

		expect(url).toBe("https://example.test/ingest");
		expect(init.method).toBe("POST");
		expect(init.headers[INGEST_SECRET_HEADER]).toBe(SECRET);
		expect(JSON.parse(init.body)).toMatchObject({ action: "batch", blogId: "toss", generation: 1 });
	});

	it("secret이 비어 있으면 만들지 못한다", () => {
		expect(() => createIngestClient({ secret: "" })).toThrow();
	});

	it("429/5xx는 제한 횟수만큼 재시도하고 Retry-After를 따른다", async () => {
		const sleeps: number[] = [];
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(429, { message: "slow", code: "rate" }, { "retry-after": "2" }))
			.mockResolvedValueOnce(jsonResponse(503, { message: "down", code: "x" }))
			.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
		const client = createIngestClient({ secret: SECRET, fetchImpl, sleep: async (ms: number) => void sleeps.push(ms) });

		await expect(client.checkpoint({ ...LEASE, checkpoint: { nextPage: 2 } })).resolves.toEqual({ ok: true });
		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(sleeps[0]).toBe(2000);
		expect(sleeps[1]).toBeGreaterThanOrEqual(2000);
	});

	it("재시도를 소진하면 마지막 오류를 던진다", async () => {
		const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(500, { message: "boom", code: "internal_error" }));
		const client = createIngestClient({ secret: SECRET, fetchImpl, sleep: async () => {}, maxAttempts: 3 });

		await expect(client.finish({ ...LEASE, evidence: {} })).rejects.toMatchObject({ status: 500, code: "internal_error" });
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it("409(stale)·422(검증 거절)는 재시도하지 않는다", async () => {
		const stale = vi.fn().mockImplementation(async () => jsonResponse(409, { message: "stale_lease", code: "stale_lease" }));
		const rejected = vi.fn().mockImplementation(async () => jsonResponse(422, { message: "count_mismatch", code: "rejected" }));

		const staleError = await createIngestClient({ secret: SECRET, fetchImpl: stale, sleep: async () => {} })
			.batch({ ...LEASE, items: [] })
			.catch((error) => error);
		const rejectedError = await createIngestClient({ secret: SECRET, fetchImpl: rejected, sleep: async () => {} })
			.finish({ ...LEASE, evidence: {} })
			.catch((error) => error);

		expect(stale).toHaveBeenCalledTimes(1);
		expect(rejected).toHaveBeenCalledTimes(1);
		expect(isStaleLeaseError(staleError)).toBe(true);
		expect(isStaleLeaseError(rejectedError)).toBe(false);
		expect(rejectedError).toBeInstanceOf(IngestError);
	});

	it("네트워크 실패는 재시도하고, 끝내 실패하면 status 0으로 던진다", async () => {
		const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const client = createIngestClient({ secret: SECRET, fetchImpl, sleep: async () => {}, maxAttempts: 2 });

		await expect(client.fail({ ...LEASE, errorCode: "network" })).rejects.toMatchObject({ status: 0, code: "network" });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it("claim은 재시도하지 않는다", async () => {
		const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(502, { message: "bad gateway", code: "x" }));
		const client = createIngestClient({ secret: SECRET, fetchImpl, sleep: async () => {} });

		await expect(client.claim({ blogId: "toss", trigger: "daily" })).rejects.toBeInstanceOf(IngestError);
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("오류 메시지에 secret이 들어가지 않는다", async () => {
		const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse(401, { message: "인증에 실패했습니다", code: "unauthorized" }));
		const error = await createIngestClient({ secret: SECRET, fetchImpl, sleep: async () => {} })
			.claim({ blogId: "toss", trigger: "daily" })
			.catch((caught) => caught);

		expect(String(error.message)).not.toContain(SECRET);
	});
});

describe("computeBackoffMs", () => {
	it("지수로 늘고 상한이 있다", () => {
		expect(computeBackoffMs({ attempt: 1, random: () => 0 })).toBe(1000);
		expect(computeBackoffMs({ attempt: 3, random: () => 0 })).toBe(4000);
		expect(computeBackoffMs({ attempt: 20, random: () => 0 })).toBe(60_000);
		expect(computeBackoffMs({ attempt: 1, retryAfter: "120" })).toBe(60_000);
	});
});
