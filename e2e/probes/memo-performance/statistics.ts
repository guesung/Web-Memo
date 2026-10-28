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
	readonly query_cache: "empty" | "reused" | "cleared" | "unknown";
	readonly http_cache: "empty" | "reused" | "disabled_by_routing" | "unknown";
	readonly router_prefetch: "observed" | "not_observed" | "unknown";
	readonly observed_content_ready: boolean;
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
const isChoice = (
	value: unknown,
	choices: readonly string[],
): value is string => typeof value === "string" && choices.includes(value);

/** Rebuild exports instead of serializing annotations, assertions, or request objects. */
export function sanitizeAttempt(value: unknown): Attempt | null {
	if (
		!isRecord(value) ||
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
		value.request_count !==
			value.memo_request_count + value.auxiliary_request_count ||
		!isChoice(value.query_cache, ["empty", "reused", "cleared", "unknown"]) ||
		!isChoice(value.http_cache, [
			"empty",
			"reused",
			"disabled_by_routing",
			"unknown",
		]) ||
		!isChoice(value.router_prefetch, ["observed", "not_observed", "unknown"]) ||
		typeof value.observed_content_ready !== "boolean"
	)
		return null;
	const safe: Attempt = {
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
		query_cache: value.query_cache as Attempt["query_cache"],
		http_cache: value.http_cache as Attempt["http_cache"],
		router_prefetch: value.router_prefetch as Attempt["router_prefetch"],
		observed_content_ready: value.observed_content_ready,
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
	};
}

/** Each condition is a separate cell; failures stay in its denominator only. */
export function summarizeByCondition(attempts: readonly Attempt[]) {
	const groups = new Map<string, Attempt[]>();
	for (const attempt of attempts) {
		const key = JSON.stringify([
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
