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
) {
	const items =
		view === "grid"
			? page.locator(".memo-item")
			: page.getByTestId("memo-list-item");
	await expect
		.poll(async () => (active === current() ? items.count() : -1), {
			timeout: BUDGET_MS,
		})
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
		const signature = await items.evaluateAll((elements) =>
			elements
				.map((element) => {
					const box = element.getBoundingClientRect();
					return `${element.textContent?.slice(0, 32)}:${box.x}:${box.y}:${box.width}:${box.height}`;
				})
				.join("|"),
		);
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
				if (
					request === trackedRequest &&
					requestGenerations.get(request) === generation
				)
					nextMemoEnd = performance.now();
			});
			page.on("requestfailed", (request) => {
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
			requestCount = 0;
			memoCount = 0;
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
			let requestWait: number | undefined;
			let failureReason: Attempt["failure_reason"] = "none";
			let contentBeforeResponse: boolean | undefined;
			let endedAt: number | null = null;
			let staleResponse: Promise<unknown> | null = null;
			generation++;
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
						const cancelled: Attempt = {
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
						nextMemoStart = null;
						nextMemoEnd = null;
						trackedRequest = null;
						start = performance.now();
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
					await ready(
						page,
						expected,
						scenario.action === "load_more" ? "list" : scenario.view,
						generation,
						() => generation,
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
						await ready(
							page,
							expected,
							scenario.view,
							generation,
							() => generation,
						);
					}
					if (staleResponse) {
						await staleResponse;
						await ready(
							page,
							expected,
							scenario.view,
							generation,
							() => generation,
						);
					}
				}
			} catch {
				outcome = "timeout";
				failureReason = "unexpected_result";
			}
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
			test.info().annotations.push({
				type: "memo-performance-stage",
				description: "record",
			});
			const attempt: Attempt = {
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
