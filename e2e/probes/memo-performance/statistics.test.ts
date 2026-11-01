import { describe, expect, it } from "vitest";
import {
	type Attempt,
	countCdpSamples,
	nearestRank,
	sanitizeAttempt,
	summarize,
	summarizeByCondition,
} from "./statistics";

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
	measurement_version: 3,
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
	highlight_request_count: 0,
	source_request_count: 0,
	other_request_count: 0,
	validation_ms: 2,
	trigger_total_ms: 4,
	observed_item_count: 20,
	auxiliary_settled: true,
	settle_ms: 0,
	pending_auxiliary_request_count: 0,
	query_cache: "empty",
	http_cache: "empty",
	router_prefetch: "unknown",
	observed_content_ready: true,
	cdp_sample_complete: true,
	cdp_sample_elapsed_ms: 100,
	cdp_sample_item_count: 20,
	layout_count: 2,
	layout_duration_ms: 3,
	recalc_style_count: 4,
	recalc_style_duration_ms: 5,
	script_duration_ms: 6,
	task_duration_ms: 7,
	end_nodes: 100,
	end_js_heap_used_bytes: 4096,
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
			{ measurement_version: 1 },
			{ measurement_version: 2 },
			{ validation_ms: -1 },
			{ validation_ms: "2" },
			{ trigger_total_ms: Number.POSITIVE_INFINITY },
			{ observed_item_count: 1.2 },
			{ highlight_request_count: 1 },
			{ source_request_count: -1 },
			{ settle_ms: -1 },
			{ pending_auxiliary_request_count: 0.5 },
			{ auxiliary_settled: "true" },
			{ outcome: "blocked" },
			{ layout_count: -1 },
			{ layout_count: 1.5 },
			{ layout_duration_ms: Number.POSITIVE_INFINITY },
			{ end_nodes: "100" },
			{ end_js_heap_used_bytes: -1 },
			{ cdp_sample_complete: "true" },
			{ cdp_sample_elapsed_ms: -1 },
			{ cdp_sample_item_count: 1.5 },
			{ layout_count: null },
		]) {
			expect(sanitizeAttempt({ ...attempt(), ...overrides })).toBeNull();
		}
	});
	it("preserves partial metrics and nulls when only the baseline exists", () => {
		const partial = attempt({
			outcome: "timeout",
			cdp_sample_complete: false,
			cdp_sample_elapsed_ms: 120000,
			cdp_sample_item_count: 1800,
		});
		expect(sanitizeAttempt(partial)).toEqual(partial);
		const noEndSample = {
			...partial,
			cdp_sample_elapsed_ms: 0,
			cdp_sample_item_count: null,
			layout_count: null,
			layout_duration_ms: null,
			recalc_style_count: null,
			recalc_style_duration_ms: null,
			script_duration_ms: null,
			task_duration_ms: null,
			end_nodes: null,
			end_js_heap_used_bytes: null,
		};
		expect(sanitizeAttempt(noEndSample)).toEqual(noEndSample);
	});
	it("counts incomplete successful measurements separately from timeout partials", () => {
		expect(
			countCdpSamples([
				attempt(),
				attempt({ cdp_sample_complete: false }),
				attempt({ outcome: "empty", cdp_sample_complete: false }),
				attempt({ outcome: "timeout", cdp_sample_complete: false }),
			]),
		).toEqual({ partial: 3, failed: 2, timeout_partial: 1 });
	});
	it("keeps only finite nonnegative v3 measurements and request categories", () => {
		const safe = sanitizeAttempt({
			...attempt({
				request_count: 5,
				memo_request_count: 2,
				auxiliary_request_count: 3,
				highlight_request_count: 1,
				source_request_count: 1,
				other_request_count: 1,
				observed_item_count: 2000,
			}),
			request_url: "PRIVATE",
			memo_id: "PRIVATE",
		});
		expect(safe).toMatchObject({
			measurement_version: 3,
			layout_count: 2,
			layout_duration_ms: 3,
			end_nodes: 100,
			validation_ms: 2,
			trigger_total_ms: 4,
			observed_item_count: 2000,
			highlight_request_count: 1,
			source_request_count: 1,
			other_request_count: 1,
		});
		expect(JSON.stringify(safe)).not.toContain("PRIVATE");
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
	it("keeps v3 browser metrics in each condition summary", () => {
		const [cell] = summarizeByCondition([
			attempt(),
			attempt({ layout_count: 4, layout_duration_ms: 9 }),
			attempt({ cdp_sample_complete: false, layout_count: 99 }),
		]);
		expect(cell.condition.measurement_version).toBe(3);
		expect(cell.browser_metrics.layout_count).toEqual({
			n: 2,
			samples: [2, 4],
			min: 2,
			max: 4,
		});
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
