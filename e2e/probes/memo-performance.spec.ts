import type { Page, Request } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../tests/fixtures/web";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../tests/lib/mocks";
import {
	diffCdpMetrics,
	readCdpMetrics,
	retainCdpSample,
	type Snapshot,
} from "./memo-performance/cdpMetrics";
import type {
	Action,
	Attempt,
	RouteName,
	View,
} from "./memo-performance/statistics";

type Scenario = {
	name: string;
	route: RouteName;
	action: Action;
	size: number;
	view: View;
	profile: "normal" | "slow" | "mock_delay";
};
const ROUTES: Record<RouteName, string> = {
	all: PATHS.memos,
	star: PATHS.memosStar,
	wish: PATHS.memosWish,
	reading: PATHS.memosReading,
};
const sidebarLink = (page: Page, route: RouteName) =>
	page
		.locator(`a[data-sidebar="menu-button"][href="/en${ROUTES[route]}"]`)
		.first();

const visibleCount = (
	seedRoute: RouteName,
	viewedRoute: RouteName,
	size: number,
) =>
	viewedRoute === "all"
		? seedRoute === "wish"
			? 0
			: size
		: seedRoute === viewedRoute
			? size
			: 0;
const PAGE_SIZE = 20;
const BUDGET_MS = 30_000;
const smoke: Scenario[] = (Object.keys(ROUTES) as RouteName[]).map((route) => ({
	name: `${route}_hard_20`,
	route,
	action: "hard",
	size: 20,
	view: "grid",
	profile: "normal",
}));
const extended: Scenario[] = [
	...smoke,
	...(Object.keys(ROUTES) as RouteName[]).flatMap((route): Scenario[] => [
		{
			name: `${route}_reload_20`,
			route,
			action: "reload",
			size: 20,
			view: "grid",
			profile: "normal",
		},
		{
			name: `${route}_warm_20`,
			route,
			action: "warm",
			size: 20,
			view: "grid",
			profile: "normal",
		},
		{
			name: `${route}_internal_20`,
			route,
			action: "internal",
			size: 20,
			view: "grid",
			profile: "normal",
		},
		{
			name: `${route}_slow_20`,
			route,
			action: "hard",
			size: 20,
			view: "grid",
			profile: "slow",
		},
	]),
	...[0, 21, 200, 2000].map(
		(size): Scenario => ({
			name: `all_hard_${size}`,
			route: "all",
			action: "hard",
			size,
			view: "grid",
			profile: "normal",
		}),
	),
	{
		name: "all_list_21",
		route: "all",
		action: "hard",
		size: 21,
		view: "list",
		profile: "normal",
	},
	{
		name: "all_domain_200",
		route: "all",
		action: "hard",
		size: 200,
		view: "domain",
		profile: "normal",
	},
	{
		name: "all_search_20",
		route: "all",
		action: "search",
		size: 20,
		view: "grid",
		profile: "normal",
	},
	{
		name: "all_filter_20",
		route: "all",
		action: "filter",
		size: 20,
		view: "grid",
		profile: "normal",
	},
	{
		name: "all_category_20",
		route: "all",
		action: "category",
		size: 20,
		view: "grid",
		profile: "normal",
	},
	{
		name: "all_view_20",
		route: "all",
		action: "view",
		size: 20,
		view: "list",
		profile: "normal",
	},
	{
		name: "all_load_more_21",
		route: "all",
		action: "load_more",
		size: 21,
		view: "list",
		profile: "normal",
	},
	...[200, 2000].map(
		(size): Scenario => ({
			name: `all_load_more_${size}`,
			route: "all",
			action: "load_more",
			size,
			view: "list",
			profile: "normal",
		}),
	),
	{
		name: "all_cache_20",
		route: "all",
		action: "cache",
		size: 20,
		view: "grid",
		profile: "mock_delay",
	},
	{
		name: "all_rapid_20",
		route: "all",
		action: "rapid",
		size: 20,
		view: "grid",
		profile: "normal",
	},
	{
		name: "all_error_20",
		route: "all",
		action: "error",
		size: 20,
		view: "grid",
		profile: "normal",
	},
	{
		name: "all_next_error_21",
		route: "all",
		action: "next_error",
		size: 21,
		view: "list",
		profile: "normal",
	},
	{
		name: "all_timeout_20",
		route: "all",
		action: "timeout",
		size: 20,
		view: "grid",
		profile: "mock_delay",
	},
	{
		name: "all_delay_20",
		route: "all",
		action: "hard",
		size: 20,
		view: "grid",
		profile: "mock_delay",
	},
];
const selectedNames =
	process.env.MEMO_PERF_SCENARIOS?.split(",") ?? smoke.map(({ name }) => name);
const selected = selectedNames.map((name) => {
	const scenario = extended.find((candidate) => candidate.name === name);
	if (!scenario) throw new Error("Unknown MEMO_PERF_SCENARIOS value");
	return scenario;
});
const repetitions = Number(process.env.MEMO_PERF_REPETITIONS ?? "1");
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100)
	throw new Error("MEMO_PERF_REPETITIONS must be 1..100");

function seed(size: number, route: RouteName) {
	resetMockIds();
	const store = new MockSupabaseStore();
	const category = store.addCategory(createMockCategory({ name: "Probe" }));
	const other = store.addCategory(createMockCategory({ name: "Other" }));
	for (let index = 0; index < size; index++) {
		store.addMemo(
			createMockMemo({
				title: index === 0 ? "probe-needle" : `Probe memo ${index}`,
				memo:
					index % 2
						? "Long synthetic text ".repeat(30)
						: "Short synthetic text",
				url: `https://${index % 2 ? "example.org" : "example.com"}/probe-${index}`,
				isWish: route === "wish",
				isStar: route === "star",
				isReading: route === "reading",
				category_id: index % 2 ? other.id : category.id,
			}),
		);
	}
	return store;
}

function isMemoListRequest(request: Request) {
	const url = new URL(request.url());
	return (
		url.origin === new URL(SUPABASE.url).origin &&
		url.pathname === "/rest/v1/memo" &&
		request.method() === "GET" &&
		!url.searchParams.get("select")?.startsWith("url")
	);
}

async function ready(
	page: Page,
	expected: number,
	view: View,
	active: number,
	current: () => number,
	onCount?: (count: number) => void,
) {
	const items =
		view === "grid"
			? page.locator(".memo-item")
			: page.getByTestId("memo-list-item");
	await expect
		.poll(
			async () => {
				const count = active === current() ? await items.count() : -1;
				if (count >= 0) onCount?.(count);
				return count;
			},
			{
				timeout: BUDGET_MS,
				intervals: [100, 200, 400],
			},
		)
		.toBe(expected);
	if (active !== current()) throw new Error("superseded generation");
	if (expected === 0) {
		await expect(
			page
				.getByText("No results")
				.or(page.getByText("Create your first memo"))
				.first(),
		).toBeVisible();
		await page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				),
		);
		return;
	}
	await expect(items.first()).toBeVisible();
	await expect(items.first()).toContainText("probe-needle");
	let stable = 0;
	let previous = "";
	while (stable < 2) {
		if (active !== current()) throw new Error("superseded generation");
		const signature = await items.last().evaluate((element) => {
			const box = element.getBoundingClientRect();
			return `${element.textContent?.slice(0, 32)}:${box.x}:${box.y}:${box.width}:${box.height}`;
		});
		stable = signature === previous ? stable + 1 : 0;
		previous = signature;
		await page.evaluate(
			() =>
				new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
		);
	}
}

for (const scenario of selected) {
	for (let repeat = 0; repeat < repetitions; repeat++) {
		test(`${scenario.name} sample ${repeat + 1}`, async ({
			page,
			context,
			browser,
		}) => {
			if (scenario.action === "load_more" && scenario.size > PAGE_SIZE + 1)
				test.setTimeout(180_000);
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "seed",
			});
			const store = seed(scenario.size, scenario.route);
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "mocks",
			});
			await setupSupabaseMocks(page, store);
			let generation = 0;
			let requestCount = 0;
			let memoCount = 0;
			let highlightCount = 0;
			let sourceCount = 0;
			let otherCount = 0;
			const pendingAuxiliary = new Set<Request>();
			let memoFailed = false;
			let delayCacheRevalidation = false;
			let firstErrorAt: number | null = null;
			let routerPrefetch = false;
			let nextMemoStart: number | null = null;
			let nextMemoEnd: number | null = null;
			let trackedRequest: Request | null = null;
			const requestGenerations = new Map<Request, number>();
			page.on("request", (request) => {
				if (
					request.headers()["next-router-prefetch"] ||
					request.headers().purpose === "prefetch"
				)
					routerPrefetch = true;
				if (new URL(request.url()).origin !== new URL(SUPABASE.url).origin)
					return;
				requestCount++;
				if (isMemoListRequest(request)) {
					memoCount++;
					requestGenerations.set(request, generation);
					if (trackedRequest === null) {
						trackedRequest = request;
						nextMemoStart = performance.now();
					}
				} else {
					pendingAuxiliary.add(request);
					const pathname = new URL(request.url()).pathname;
					if (
						pathname === "/rest/v1/rpc/get_highlight_counts" ||
						pathname === "/rest/v1/highlight"
					)
						highlightCount++;
					else if (pathname === "/rest/v1/highlight_memo_source") sourceCount++;
					else otherCount++;
				}
			});
			page.on("response", (response) => {
				if (requestGenerations.get(response.request()) !== generation) return;
				if (!response.ok()) {
					memoFailed = true;
					firstErrorAt ??= performance.now();
				}
			});
			page.on("requestfinished", (request) => {
				pendingAuxiliary.delete(request);
				if (
					request === trackedRequest &&
					requestGenerations.get(request) === generation
				)
					nextMemoEnd = performance.now();
			});
			page.on("requestfailed", (request) => {
				pendingAuxiliary.delete(request);
				if (requestGenerations.get(request) === generation) {
					memoFailed = true;
					firstErrorAt ??= performance.now();
				}
			});
			if (scenario.profile === "slow") {
				const session = await context.newCDPSession(page);
				await session.send("Network.enable");
				await session.send("Network.emulateNetworkConditions", {
					offline: false,
					latency: 150,
					downloadThroughput: 200_000,
					uploadThroughput: 93_750,
				});
				await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
			}
			if (
				["error", "next_error", "timeout", "rapid", "cache"].includes(
					scenario.action,
				) ||
				scenario.name === "all_delay_20"
			) {
				await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
					if (!isMemoListRequest(route.request())) return route.fallback();
					if (scenario.action === "cache") {
						if (delayCacheRevalidation)
							await new Promise((resolve) => setTimeout(resolve, 1500));
						return route.fallback();
					}
					if (
						scenario.action === "next_error" &&
						!new URL(route.request().url()).searchParams.has("or")
					)
						return route.fallback();
					if (scenario.action === "rapid") {
						if (route.request().url().includes("missing-probe"))
							await new Promise((resolve) => setTimeout(resolve, 1500));
						return route.fallback();
					}
					if (scenario.action === "timeout")
						await new Promise((resolve) =>
							setTimeout(resolve, BUDGET_MS + 1000),
						);
					else if (scenario.name === "all_delay_20") {
						await new Promise((resolve) => setTimeout(resolve, 1500));
						await route.fallback();
					} else
						await route.fulfill({
							status: 500,
							contentType: "application/json",
							body: "{}",
						});
				});
			}
			const url = `/en${ROUTES[scenario.route]}${scenario.view === "grid" ? "" : `?view=${scenario.view}`}`;
			const initialView =
				scenario.action === "load_more" || scenario.action === "next_error"
					? "list"
					: "grid";
			if (
				[
					"warm",
					"reload",
					"search",
					"filter",
					"category",
					"view",
					"load_more",
					"next_error",
					"cache",
					"rapid",
					"internal",
				].includes(scenario.action)
			) {
				test.info().annotations.push({
					type: "memo-performance-stage",
					description: "initial",
				});
				const initialRoute =
					scenario.action === "internal"
						? scenario.route === "all"
							? "star"
							: "all"
						: scenario.route;
				await page.goto(
					`/en${ROUTES[initialRoute]}${initialView === "list" ? "?view=list" : ""}`,
				);
				await ready(
					page,
					Math.min(
						visibleCount(scenario.route, initialRoute, scenario.size),
						PAGE_SIZE,
					),
					initialView,
					++generation,
					() => generation,
				);
			}
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "prepare",
			});
			if (scenario.action === "cache") {
				await page.getByPlaceholder("Search memos").fill("probe-needle");
				await ready(page, 1, "grid", ++generation, () => generation);
			}
			if (scenario.action === "warm") {
				await sidebarLink(
					page,
					scenario.route === "all" ? "star" : "all",
				).click();
				await ready(
					page,
					Math.min(
						visibleCount(
							scenario.route,
							scenario.route === "all" ? "star" : "all",
							scenario.size,
						),
						PAGE_SIZE,
					),
					"grid",
					++generation,
					() => generation,
				);
			}
			const metricSession = await context.newCDPSession(page);
			await metricSession.send("Performance.enable");
			let metricStart = await readCdpMetrics(metricSession);
			let latestMetricSample: {
				snapshot: Snapshot | null;
				elapsedMs: number;
				itemCount: number | null;
			} = { snapshot: null, elapsedMs: 0, itemCount: null };
			requestCount = 0;
			memoCount = 0;
			highlightCount = 0;
			sourceCount = 0;
			otherCount = 0;
			pendingAuxiliary.clear();
			nextMemoStart = null;
			nextMemoEnd = null;
			trackedRequest = null;
			firstErrorAt = null;
			routerPrefetch = false;
			memoFailed = false;
			let start = performance.now();
			let outcome: Attempt["outcome"] = "success";
			let observed = false;
			let expected = Math.min(scenario.size, PAGE_SIZE);
			let triggerWait: number | undefined;
			let triggerTotal = 0;
			let validationMs = 0;
			let observedItemCount = 0;
			let auxiliarySettled = false;
			let settleMs = 0;
			const observeCount = (count: number) => {
				observedItemCount = count;
			};
			const measuredReady = async (count: number, view: View) => {
				const began = performance.now();
				try {
					await ready(
						page,
						count,
						view,
						generation,
						() => generation,
						observeCount,
					);
				} finally {
					validationMs += performance.now() - began;
				}
			};
			let requestWait: number | undefined;
			let failureReason: Attempt["failure_reason"] = "none";
			let contentBeforeResponse: boolean | undefined;
			let endedAt: number | null = null;
			let staleResponse: Promise<unknown> | null = null;
			generation++;
			const actionBegan = performance.now();
			const capturePageMetricSample = async () => {
				const sample = await retainCdpSample(
					() => readCdpMetrics(metricSession),
					latestMetricSample.snapshot,
					metricStart,
				);
				if (sample.complete) {
					latestMetricSample = {
						snapshot: sample.snapshot,
						elapsedMs: Math.round(performance.now() - actionBegan),
						itemCount: observedItemCount,
					};
				}
			};
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "action",
			});
			try {
				switch (scenario.action) {
					case "reload":
						await page.reload({ waitUntil: "commit" });
						break;
					case "internal":
					case "warm":
						await sidebarLink(page, scenario.route).click();
						await page.waitForURL(
							(location) =>
								location.pathname === `/en${ROUTES[scenario.route]}`,
						);
						break;
					case "search":
						await page.getByPlaceholder("Search memos").fill("probe-needle");
						expected = scenario.size ? 1 : 0;
						break;
					case "filter":
						await page
							.getByRole("button", { name: "Domain", exact: true })
							.click();
						await page
							.getByRole("option", { name: "example.com", exact: true })
							.click();
						expected = Math.ceil(scenario.size / 2);
						break;
					case "category":
						await page
							.locator(".memo-item")
							.first()
							.getByText("Probe", { exact: true })
							.click();
						expected = Math.ceil(scenario.size / 2);
						break;
					case "view":
						await page.getByRole("button", { name: "By created date" }).click();
						break;
					case "load_more":
					case "next_error": {
						const triggerStart = performance.now();
						if (
							scenario.action === "load_more" &&
							scenario.size > PAGE_SIZE + 1
						) {
							let loaded = PAGE_SIZE;
							while (loaded < scenario.size) {
								const previousRequests = memoCount;
								const loadMore = page.getByRole("button", {
									name: "Load more",
								});
								const pageTriggerStart = performance.now();
								try {
									await loadMore.scrollIntoViewIfNeeded();
									try {
										await expect
											.poll(() => memoCount, { timeout: 1_000 })
											.toBeGreaterThan(previousRequests);
									} catch {
										if (
											memoCount === previousRequests &&
											(await loadMore.isEnabled())
										)
											await loadMore.click();
									}
									await expect
										.poll(() => memoCount, { timeout: BUDGET_MS })
										.toBeGreaterThan(previousRequests);
								} finally {
									triggerTotal += performance.now() - pageTriggerStart;
								}
								if (loaded === PAGE_SIZE) {
									triggerWait = Math.round(
										(nextMemoStart ?? triggerStart) - triggerStart,
									);
									start = nextMemoStart ?? triggerStart;
								}
								loaded = Math.min(loaded + PAGE_SIZE, scenario.size);
								await measuredReady(loaded, "list");
								await capturePageMetricSample();
							}
						} else {
							await page
								.getByRole("button", { name: "Load more" })
								.scrollIntoViewIfNeeded();
							await expect
								.poll(() => nextMemoStart, { timeout: BUDGET_MS })
								.not.toBeNull();
							triggerWait = Math.round(
								(nextMemoStart ?? triggerStart) - triggerStart,
							);
							start = nextMemoStart ?? triggerStart;
						}
						expected = scenario.size;
						break;
					}
					case "rapid": {
						const input = page.getByPlaceholder("Search memos");
						const firstStart = performance.now();
						staleResponse = page
							.waitForResponse(
								(response) =>
									isMemoListRequest(response.request()) &&
									response.url().includes("missing-probe"),
								{ timeout: 10_000 },
							)
							.then((response) => response.finished());
						await Promise.all([
							page.waitForRequest(
								(request) =>
									isMemoListRequest(request) &&
									request.url().includes("missing-probe"),
							),
							input.fill("missing-probe"),
						]);
						generation++;
						const cancelledMetrics = diffCdpMetrics(
							metricStart,
							await readCdpMetrics(metricSession),
						);
						const cancelled: Attempt = {
							measurement_version: 3,
							...cancelledMetrics,
							cdp_sample_complete: true,
							cdp_sample_elapsed_ms: Math.round(
								performance.now() - actionBegan,
							),
							cdp_sample_item_count: observedItemCount,
							scenario: scenario.name,
							route: scenario.route,
							action: "rapid",
							view: scenario.view,
							fixture_size: scenario.size,
							network_profile: scenario.profile,
							outcome: "cancelled",
							browser_version: browser.version(),
							duration_ms: Math.round(performance.now() - firstStart),
							request_count: requestCount,
							memo_request_count: memoCount,
							auxiliary_request_count: requestCount - memoCount,
							highlight_request_count: highlightCount,
							source_request_count: sourceCount,
							other_request_count: otherCount,
							validation_ms: Math.round(validationMs),
							trigger_total_ms: Math.round(performance.now() - actionBegan),
							observed_item_count: observedItemCount,
							auxiliary_settled: pendingAuxiliary.size === 0,
							settle_ms: 0,
							pending_auxiliary_request_count: pendingAuxiliary.size,
							query_cache: "unknown",
							http_cache: "disabled_by_routing",
							router_prefetch: routerPrefetch ? "observed" : "not_observed",
							observed_content_ready: false,
							failure_reason: "none",
							navigation: "client_navigation",
						};
						test.info().annotations.push({
							type: "memo-performance-attempt",
							description: JSON.stringify(cancelled),
						});
						requestCount = 0;
						memoCount = 0;
						highlightCount = 0;
						sourceCount = 0;
						otherCount = 0;
						pendingAuxiliary.clear();
						nextMemoStart = null;
						nextMemoEnd = null;
						trackedRequest = null;
						start = performance.now();
						metricStart = await readCdpMetrics(metricSession);
						await input.fill("probe-needle");
						expected = 1;
						break;
					}
					case "cache":
						delayCacheRevalidation = true;
						await page.getByPlaceholder("Search memos").fill("");
						break;
					default:
						await page.goto(url, { waitUntil: "commit" });
				}
				if (scenario.action !== "load_more" || scenario.size <= PAGE_SIZE + 1)
					triggerTotal = performance.now() - actionBegan;
				test.info().annotations.push({
					type: "memo-performance-stage",
					description: "ready",
				});
				if (scenario.action === "error" || scenario.action === "next_error") {
					await expect
						.poll(() => memoFailed, { timeout: BUDGET_MS })
						.toBe(true);
					outcome = "error";
					failureReason = "mock_response_error";
					endedAt = firstErrorAt;
				} else if (scenario.action === "timeout") {
					await expect
						.poll(() => memoFailed, { timeout: BUDGET_MS })
						.toBe(true);
				} else {
					await measuredReady(
						expected,
						scenario.action === "load_more" ? "list" : scenario.view,
					);
					observed = true;
					outcome = expected ? "success" : "empty";
					endedAt = performance.now();
					if (["filter", "category", "view"].includes(scenario.action)) {
						expect(new URL(page.url()).pathname).toBe(
							`/en${ROUTES[scenario.route]}`,
						);
					}
					if (scenario.action === "cache") {
						contentBeforeResponse =
							nextMemoEnd === null || nextMemoEnd > endedAt;
						expect(contentBeforeResponse).toBe(true);
						const pending = [...requestGenerations.entries()].find(
							([, startedGeneration]) => startedGeneration === generation,
						)?.[0];
						const response = await pending?.response();
						await response?.finished();
						await measuredReady(expected, scenario.view);
					}
					if (staleResponse) {
						await staleResponse;
						await measuredReady(expected, scenario.view);
					}
				}
			} catch {
				outcome = "timeout";
				failureReason = "unexpected_result";
				observedItemCount = await (scenario.action === "load_more" ||
				scenario.action === "next_error" ||
				scenario.view === "list"
					? page.getByTestId("memo-list-item")
					: page.locator(".memo-item")
				)
					.count()
					.catch(() => observedItemCount);
			}
			if (
				triggerTotal === 0 &&
				(scenario.action !== "load_more" || scenario.size <= PAGE_SIZE + 1)
			)
				triggerTotal = performance.now() - actionBegan;
			endedAt ??= performance.now();
			if (
				scenario.action === "timeout" &&
				outcome === "timeout" &&
				failureReason === "unexpected_result"
			)
				failureReason = "budget_exhausted";
			if (nextMemoStart !== null && nextMemoEnd !== null)
				requestWait = Math.round(nextMemoEnd - nextMemoStart);
			const navigationTiming = ["hard", "reload", "error", "timeout"].includes(
				scenario.action,
			)
				? await page.evaluate(() => {
						const nav = performance.getEntriesByType("navigation")[0] as
							| PerformanceNavigationTiming
							| undefined;
						const paint = performance.getEntriesByName(
							"first-contentful-paint",
						)[0];
						return nav
							? {
									duration: Math.round(performance.now() - nav.startTime),
									ttfb:
										nav.responseStart > 0
											? Math.round(nav.responseStart - nav.startTime)
											: undefined,
									fcp: paint
										? Math.round(paint.startTime - nav.startTime)
										: undefined,
								}
							: null;
					})
				: null;
			if (observed) {
				const settleBegan = performance.now();
				try {
					await expect
						.poll(() => pendingAuxiliary.size, {
							timeout: 1_500,
							intervals: [50, 100, 200],
						})
						.toBe(0);
				} catch {
					// The bounded observation window leaves pending requests as a numeric result.
				}
				settleMs = performance.now() - settleBegan;
			}
			auxiliarySettled = pendingAuxiliary.size === 0;
			const finalSample = await retainCdpSample(
				() => readCdpMetrics(metricSession),
				latestMetricSample.snapshot,
				metricStart,
			);
			const sampleComplete = finalSample.complete;
			const sampleSnapshot = finalSample.snapshot;
			let sampleElapsedMs = latestMetricSample.elapsedMs;
			let sampleItemCount = latestMetricSample.itemCount;
			if (sampleComplete) {
				sampleElapsedMs = Math.round(performance.now() - actionBegan);
				sampleItemCount = observedItemCount;
			}
			const browserMetrics = sampleSnapshot
				? diffCdpMetrics(metricStart, sampleSnapshot)
				: null;
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "record",
			});
			const attempt: Attempt = {
				measurement_version: 3,
				...(browserMetrics ?? {
					layout_count: null,
					layout_duration_ms: null,
					recalc_style_count: null,
					recalc_style_duration_ms: null,
					script_duration_ms: null,
					task_duration_ms: null,
					end_nodes: null,
					end_js_heap_used_bytes: null,
				}),
				cdp_sample_complete: sampleComplete,
				cdp_sample_elapsed_ms: sampleElapsedMs,
				cdp_sample_item_count: sampleItemCount,
				scenario: scenario.name,
				route: scenario.route,
				action: scenario.action,
				view: scenario.view,
				fixture_size: scenario.size,
				network_profile: scenario.profile,
				outcome,
				duration_ms:
					scenario.action === "error"
						? Math.max(0, Math.round(endedAt - start))
						: (navigationTiming?.duration ??
							Math.max(0, Math.round(endedAt - start))),
				request_count: requestCount,
				memo_request_count: memoCount,
				auxiliary_request_count: requestCount - memoCount,
				highlight_request_count: highlightCount,
				source_request_count: sourceCount,
				other_request_count: otherCount,
				validation_ms: Math.round(validationMs),
				trigger_total_ms: Math.max(0, Math.round(triggerTotal)),
				observed_item_count: observedItemCount,
				auxiliary_settled: auxiliarySettled,
				settle_ms: Math.round(settleMs),
				pending_auxiliary_request_count: pendingAuxiliary.size,
				query_cache:
					scenario.action === "reload"
						? "cleared"
						: scenario.action === "cache" || scenario.action === "warm"
							? "reused"
							: scenario.action === "hard"
								? "empty"
								: "unknown",
				http_cache: "disabled_by_routing",
				router_prefetch: routerPrefetch ? "observed" : "not_observed",
				observed_content_ready: observed,
				...(contentBeforeResponse === undefined
					? {}
					: { content_before_response: contentBeforeResponse }),
				failure_reason: failureReason,
				browser_version: browser.version(),
				navigation: ["hard", "reload", "error", "timeout"].includes(
					scenario.action,
				)
					? "hard_load"
					: "client_navigation",
				...(navigationTiming?.ttfb === undefined
					? {}
					: { ttfb_ms: navigationTiming.ttfb }),
				...(navigationTiming?.fcp === undefined
					? {}
					: { fcp_ms: navigationTiming.fcp }),
				...(triggerWait === undefined ? {} : { trigger_wait_ms: triggerWait }),
				...(requestWait === undefined ? {} : { request_wait_ms: requestWait }),
			};
			test.info().annotations.push({
				type: "memo-performance-attempt",
				description: JSON.stringify(attempt),
			});
			expect(outcome).toBe(
				scenario.action === "error" || scenario.action === "next_error"
					? "error"
					: scenario.action === "timeout"
						? "timeout"
						: expected
							? "success"
							: "empty",
			);
			expect(failureReason).not.toBe("unexpected_result");
		});
	}
}
