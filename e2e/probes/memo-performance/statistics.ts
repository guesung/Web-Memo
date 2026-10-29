export const OUTCOMES = [
	"success",
	"empty",
	"error",
	"cancelled",
	"timeout",
] as const;
export type Outcome = (typeof OUTCOMES)[number];
export type RouteName = "all" | "star" | "wish" | "reading";
export type Action =
	| "hard"
	| "reload"
	| "warm"
	| "internal"
	| "search"
	| "filter"
	| "category"
	| "view"
	| "load_more"
	| "cache"
	| "rapid"
	| "error"
	| "next_error"
	| "timeout";
export type View = "grid" | "list" | "domain";

export interface Attempt {
	readonly measurement_version: 3;
	readonly scenario: string;
	readonly route: RouteName;
	readonly action: Action;
	readonly view: View;
	readonly fixture_size: number;
	readonly network_profile: "normal" | "slow" | "mock_delay";
	readonly outcome: Outcome;
	readonly duration_ms: number;
	readonly request_count: number;
	readonly memo_request_count: number;
	readonly auxiliary_request_count: number;
	readonly highlight_request_count: number;
	readonly source_request_count: number;
	readonly other_request_count: number;
	readonly validation_ms: number;
	readonly trigger_total_ms: number;
	readonly observed_item_count: number;
	readonly auxiliary_settled: boolean;
	readonly settle_ms: number;
	readonly pending_auxiliary_request_count: number;
	readonly query_cache: "empty" | "reused" | "cleared" | "unknown";
	readonly http_cache: "empty" | "reused" | "disabled_by_routing" | "unknown";
	readonly router_prefetch: "observed" | "not_observed" | "unknown";
	readonly observed_content_ready: boolean;
	readonly cdp_sample_complete: boolean;
	readonly cdp_sample_elapsed_ms: number;
	readonly cdp_sample_item_count: number | null;
	readonly layout_count: number | null;
	readonly layout_duration_ms: number | null;
	readonly recalc_style_count: number | null;
	readonly recalc_style_duration_ms: number | null;
	readonly script_duration_ms: number | null;
	readonly task_duration_ms: number | null;
	readonly end_nodes: number | null;
	readonly end_js_heap_used_bytes: number | null;
	readonly content_before_response?: boolean;
	readonly navigation?: "hard_load" | "client_navigation";
	readonly trigger_wait_ms?: number;
	readonly request_wait_ms?: number;
	readonly ttfb_ms?: number;
	readonly fcp_ms?: number;
	readonly browser_version?: string;
	readonly revision?: string;
	readonly failure_reason?:
		| "none"
		| "unexpected_result"
		| "budget_exhausted"
		| "mock_response_error"
		| "setup_blocked";
}

const SCENARIO =
	/^(all|star|wish|reading)_(hard|reload|warm|internal|slow|list|domain|search|filter|category|view|load_more|cache|rapid|error|next_error|timeout|delay)_(0|20|21|200|2000)$/;
const ACTIONS = [
	"hard",
	"reload",
	"warm",
	"internal",
	"search",
	"filter",
	"category",
	"view",
	"load_more",
	"cache",
	"rapid",
	"error",
	"next_error",
	"timeout",
];
const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
const isDuration = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value >= 0;
const isCount = (value: unknown): value is number =>
	isDuration(value) && Number.isSafeInteger(value);
const isNullable = (
	value: unknown,
	check: (value: unknown) => value is number,
): value is number | null => value === null || check(value);
const isChoice = (
	value: unknown,
	choices: readonly string[],
): value is string => typeof value === "string" && choices.includes(value);

/** Rebuild exports instead of serializing annotations, assertions, or request objects. */
export function sanitizeAttempt(value: unknown): Attempt | null {
	if (
		!isRecord(value) ||
		value.measurement_version !== 3 ||
		typeof value.scenario !== "string" ||
		!SCENARIO.test(value.scenario) ||
		!isChoice(value.route, ["all", "star", "wish", "reading"]) ||
		!isChoice(value.action, ACTIONS) ||
		!isChoice(value.view, ["grid", "list", "domain"]) ||
		typeof value.fixture_size !== "number" ||
		![0, 20, 21, 200, 2000].includes(value.fixture_size) ||
		!isChoice(value.network_profile, ["normal", "slow", "mock_delay"]) ||
		!isChoice(value.outcome, OUTCOMES) ||
		!isDuration(value.duration_ms) ||
		!isCount(value.request_count) ||
		!isCount(value.memo_request_count) ||
		!isCount(value.auxiliary_request_count) ||
		!isCount(value.highlight_request_count) ||
		!isCount(value.source_request_count) ||
		!isCount(value.other_request_count) ||
		!isDuration(value.validation_ms) ||
		!isDuration(value.trigger_total_ms) ||
		!isCount(value.observed_item_count) ||
		typeof value.auxiliary_settled !== "boolean" ||
		!isDuration(value.settle_ms) ||
		!isCount(value.pending_auxiliary_request_count) ||
		value.request_count !==
			value.memo_request_count + value.auxiliary_request_count ||
		value.auxiliary_request_count !==
			value.highlight_request_count +
				value.source_request_count +
				value.other_request_count ||
		!isChoice(value.query_cache, ["empty", "reused", "cleared", "unknown"]) ||
		!isChoice(value.http_cache, [
			"empty",
			"reused",
			"disabled_by_routing",
			"unknown",
		]) ||
		!isChoice(value.router_prefetch, ["observed", "not_observed", "unknown"]) ||
		typeof value.observed_content_ready !== "boolean" ||
		typeof value.cdp_sample_complete !== "boolean" ||
		!isDuration(value.cdp_sample_elapsed_ms) ||
		!isNullable(value.cdp_sample_item_count, isCount) ||
		!isNullable(value.layout_count, isCount) ||
		!isNullable(value.layout_duration_ms, isDuration) ||
		!isNullable(value.recalc_style_count, isCount) ||
		!isNullable(value.recalc_style_duration_ms, isDuration) ||
		!isNullable(value.script_duration_ms, isDuration) ||
		!isNullable(value.task_duration_ms, isDuration) ||
		!isNullable(value.end_nodes, isCount) ||
		!isNullable(value.end_js_heap_used_bytes, isCount) ||
		(value.cdp_sample_complete &&
			(value.cdp_sample_item_count === null || value.layout_count === null)) ||
		[
			value.layout_duration_ms,
			value.recalc_style_count,
			value.recalc_style_duration_ms,
			value.script_duration_ms,
			value.task_duration_ms,
			value.end_nodes,
			value.end_js_heap_used_bytes,
		].some((metric) => (metric === null) !== (value.layout_count === null))
	)
		return null;
	const safe: Attempt = {
		measurement_version: 3,
		scenario: value.scenario,
		route: value.route as RouteName,
		action: value.action as Action,
		view: value.view as View,
		fixture_size: value.fixture_size,
		network_profile: value.network_profile as Attempt["network_profile"],
		outcome: value.outcome as Outcome,
		duration_ms: value.duration_ms,
		request_count: value.request_count,
		memo_request_count: value.memo_request_count,
		auxiliary_request_count: value.auxiliary_request_count,
		highlight_request_count: value.highlight_request_count,
		source_request_count: value.source_request_count,
		other_request_count: value.other_request_count,
		validation_ms: value.validation_ms,
		trigger_total_ms: value.trigger_total_ms,
		observed_item_count: value.observed_item_count,
		auxiliary_settled: value.auxiliary_settled,
		settle_ms: value.settle_ms,
		pending_auxiliary_request_count: value.pending_auxiliary_request_count,
		query_cache: value.query_cache as Attempt["query_cache"],
		http_cache: value.http_cache as Attempt["http_cache"],
		router_prefetch: value.router_prefetch as Attempt["router_prefetch"],
		observed_content_ready: value.observed_content_ready,
		cdp_sample_complete: value.cdp_sample_complete,
		cdp_sample_elapsed_ms: value.cdp_sample_elapsed_ms,
		cdp_sample_item_count: value.cdp_sample_item_count,
		layout_count: value.layout_count,
		layout_duration_ms: value.layout_duration_ms,
		recalc_style_count: value.recalc_style_count,
		recalc_style_duration_ms: value.recalc_style_duration_ms,
		script_duration_ms: value.script_duration_ms,
		task_duration_ms: value.task_duration_ms,
		end_nodes: value.end_nodes,
		end_js_heap_used_bytes: value.end_js_heap_used_bytes,
		...(typeof value.content_before_response === "boolean"
			? { content_before_response: value.content_before_response }
			: {}),
		...(isChoice(value.navigation, ["hard_load", "client_navigation"])
			? { navigation: value.navigation as Attempt["navigation"] }
			: {}),
		...(isDuration(value.trigger_wait_ms)
			? { trigger_wait_ms: value.trigger_wait_ms }
			: {}),
		...(isDuration(value.request_wait_ms)
			? { request_wait_ms: value.request_wait_ms }
			: {}),
		...(isDuration(value.ttfb_ms) ? { ttfb_ms: value.ttfb_ms } : {}),
		...(isDuration(value.fcp_ms) ? { fcp_ms: value.fcp_ms } : {}),
		...(typeof value.browser_version === "string" &&
		/^\d+(\.\d+){1,4}$/.test(value.browser_version)
			? { browser_version: value.browser_version }
			: {}),
		...(typeof value.revision === "string" &&
		/^[a-f0-9]{40}$/.test(value.revision)
			? { revision: value.revision }
			: {}),
		...(isChoice(value.failure_reason, [
			"none",
			"unexpected_result",
			"budget_exhausted",
			"mock_response_error",
			"setup_blocked",
		])
			? { failure_reason: value.failure_reason as Attempt["failure_reason"] }
			: {}),
	};
	return safe;
}

export function nearestRank(
	values: readonly number[],
	percentile: number,
): number | null {
	if (!values.length) return null;
	if (
		!(percentile > 0 && percentile <= 1) ||
		values.some((value) => !isDuration(value))
	)
		throw new Error("invalid_latency_sample");
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(percentile * sorted.length) - 1];
}

export function countCdpSamples(attempts: readonly Attempt[]) {
	return {
		partial: attempts.filter((attempt) => !attempt.cdp_sample_complete).length,
		failed: attempts.filter(
			(attempt) =>
				!attempt.cdp_sample_complete &&
				(attempt.outcome === "success" || attempt.outcome === "empty"),
		).length,
		timeout_partial: attempts.filter(
			(attempt) =>
				!attempt.cdp_sample_complete && attempt.outcome === "timeout",
		).length,
	};
}

export function summarize(attempts: readonly Attempt[]) {
	const counts = { success: 0, empty: 0, error: 0, cancelled: 0, timeout: 0 };
	for (const attempt of attempts) counts[attempt.outcome]++;
	const total = attempts.length;
	const latency = (outcome: "success" | "empty") => {
		const values = attempts
			.filter((item) => item.outcome === outcome)
			.map((item) => item.duration_ms);
		return {
			n: values.length,
			samples_ms: values,
			min_ms: values.length ? Math.min(...values) : null,
			max_ms: values.length ? Math.max(...values) : null,
			p75_ms: values.length >= 30 ? nearestRank(values, 0.75) : null,
			p95_ms: values.length >= 30 ? nearestRank(values, 0.95) : null,
			p95_exploratory: values.length >= 30 && values.length < 100,
			insufficient_samples: values.length < 30,
		};
	};
	return {
		attempts: total,
		counts,
		rates: Object.fromEntries(
			Object.entries(counts).map(([key, count]) => [
				key,
				total ? count / total : null,
			]),
		),
		latency: { success: latency("success"), empty: latency("empty") },
		browser_metrics: Object.fromEntries(
			(
				[
					"layout_count",
					"layout_duration_ms",
					"recalc_style_count",
					"recalc_style_duration_ms",
					"script_duration_ms",
					"task_duration_ms",
					"end_nodes",
					"end_js_heap_used_bytes",
				] as const
			).map((key) => {
				const samples = attempts
					.filter((attempt) => attempt.cdp_sample_complete)
					.map((attempt) => attempt[key])
					.filter((value): value is number => value !== null);
				return [
					key,
					{
						n: samples.length,
						samples,
						min: samples.length ? Math.min(...samples) : null,
						max: samples.length ? Math.max(...samples) : null,
					},
				];
			}),
		),
	};
}

/** Each condition is a separate cell; failures stay in its denominator only. */
export function summarizeByCondition(attempts: readonly Attempt[]) {
	const groups = new Map<string, Attempt[]>();
	for (const attempt of attempts) {
		const key = JSON.stringify([
			attempt.measurement_version,
			attempt.scenario,
			attempt.route,
			attempt.action,
			attempt.view,
			attempt.fixture_size,
			attempt.network_profile,
			attempt.query_cache,
			attempt.http_cache,
			attempt.router_prefetch,
			attempt.navigation ?? "unknown",
			attempt.browser_version ?? "unknown",
		]);
		const group = groups.get(key) ?? [];
		group.push(attempt);
		groups.set(key, group);
	}
	return [...groups.values()].map((group) => ({
		condition: {
			measurement_version: group[0].measurement_version,
			scenario: group[0].scenario,
			route: group[0].route,
			action: group[0].action,
			view: group[0].view,
			fixture_size: group[0].fixture_size,
			network_profile: group[0].network_profile,
			query_cache: group[0].query_cache,
			http_cache: group[0].http_cache,
			router_prefetch: group[0].router_prefetch,
			navigation: group[0].navigation ?? "unknown",
			browser_version: group[0].browser_version ?? "unknown",
		},
		...summarize(group),
	}));
}
