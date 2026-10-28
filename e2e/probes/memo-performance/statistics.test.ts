import { describe, expect, it } from "vitest";
import {
	type Attempt,
	nearestRank,
	sanitizeAttempt,
	summarize,
	summarizeByCondition,
} from "./statistics";

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
	scenario: "all_hard_20",
	route: "all",
	action: "hard",
	view: "grid",
	fixture_size: 20,
	network_profile: "normal",
	outcome: "success",
	duration_ms: 100,
	request_count: 1,
	memo_request_count: 1,
	auxiliary_request_count: 0,
	query_cache: "empty",
	http_cache: "empty",
	router_prefetch: "unknown",
	observed_content_ready: true,
	...overrides,
});

describe("memo performance export and statistics", () => {
	it("drops arbitrary fields, raw errors and invalid optional metadata", () => {
		const safe = sanitizeAttempt({
			...attempt(),
			url: "https://secret.example/private?q=PRIVATE",
			title: "PRIVATE",
			body: "PRIVATE",
			error: "PRIVATE",
			browser_version: "PRIVATE",
			revision: "PRIVATE",
			failure_reason: "PRIVATE",
		});
		expect(safe).toEqual(attempt());
		expect(JSON.stringify(safe)).not.toContain("PRIVATE");
	});
	it("rejects unsafe scenario names, invalid numbers and inconsistent request counts", () => {
		for (const overrides of [
			{ scenario: "PRIVATE" },
			{ duration_ms: NaN },
			{ duration_ms: -1 },
			{ request_count: 1.5 },
			{ memo_request_count: 2 },
			{ outcome: "blocked" },
		]) {
			expect(sanitizeAttempt({ ...attempt(), ...overrides })).toBeNull();
		}
	});
	it("does not infer percentiles from fewer than 30 completed success samples", () => {
		const result = summarize(Array.from({ length: 29 }, () => attempt()));
		expect(result.latency.success).toMatchObject({
			n: 29,
			p75_ms: null,
			p95_ms: null,
			insufficient_samples: true,
		});
	});
	it("separates empty and failure outcomes from success percentiles and keeps the common denominator", () => {
		const result = summarize([
			...Array.from({ length: 30 }, (_, index) =>
				attempt({ duration_ms: index + 1 }),
			),
			attempt({ outcome: "empty", duration_ms: 500 }),
			attempt({ outcome: "error", duration_ms: 9000 }),
			attempt({ outcome: "cancelled", duration_ms: 10000 }),
			attempt({ outcome: "timeout", duration_ms: 30000 }),
		]);
		expect(result.attempts).toBe(34);
		expect(result.counts).toEqual({
			success: 30,
			empty: 1,
			error: 1,
			cancelled: 1,
			timeout: 1,
		});
		expect(result.rates.error).toBe(1 / 34);
		expect(result.latency.success).toMatchObject({
			n: 30,
			p75_ms: 23,
			p95_ms: 29,
			p95_exploratory: true,
		});
		expect(result.latency.empty).toMatchObject({
			n: 1,
			min_ms: 500,
			p75_ms: null,
		});
	});
	it("never pools different cache or network cells", () => {
		const cells = summarizeByCondition([
			attempt(),
			attempt({ network_profile: "slow" }),
			attempt({ query_cache: "reused" }),
			attempt(),
		]);
		expect(cells.map((cell) => cell.attempts)).toEqual([2, 1, 1]);
	});
	it("uses nearest rank without mutating samples and handles an empty denominator", () => {
		const values = [4, 1, 3, 2];
		expect(nearestRank(values, 0.75)).toBe(3);
		expect(values).toEqual([4, 1, 3, 2]);
		expect(summarize([]).rates.success).toBeNull();
		expect(nearestRank([], 0.95)).toBeNull();
		expect(() => nearestRank([1], 0)).toThrow("invalid_latency_sample");
	});
	it("labels p95 as exploratory until 100 valid outcome samples", () => {
		expect(
			summarize(Array.from({ length: 100 }, () => attempt())).latency.success
				.p95_exploratory,
		).toBe(false);
	});
});
