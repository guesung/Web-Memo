import type { Page, Route } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockHighlight,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const firstQuote = "Highlight quote 01";
const laterQuote = "Highlight quote 21";

async function setupHighlights(page: Page, count: number) {
	resetMockIds();
	const store = new MockSupabaseStore();
	for (let order = 1; order <= count; order++) {
		store.addHighlight(
			createMockHighlight({
				url: "https://example.com/highlight-page",
				exact_text: `Highlight quote ${String(order).padStart(2, "0")}`,
				created_at: new Date(Date.UTC(2026, 0, 1) - order * 1000).toISOString(),
			}),
		);
	}
	await setupSupabaseMocks(page, store);
}

function isHighlightGet(route: Route) {
	return (
		route.request().method() === "GET" &&
		new URL(route.request().url()).pathname.endsWith("/highlight")
	);
}

function isNextPage(route: Route) {
	return new URL(route.request().url()).searchParams
		.getAll("or")
		.some((condition) => condition.startsWith("(created_at.lt."));
}

async function gotoHighlights(page: Page) {
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.highlights}`,
		regexp: new RegExp(PATHS.highlights),
	});
}

async function scrollToNextPage(page: Page) {
	await page.evaluate(() =>
		window.scrollTo(0, document.documentElement.scrollHeight),
	);
}

test("검색 결과가 없을 때 필터를 초기화하면 기존 하이라이트가 다시 보인다.", async ({
	page,
}) => {
	await setupHighlights(page, 1);
	await gotoHighlights(page);
	await expect(page.getByText(firstQuote)).toBeVisible();
	await page.getByLabel("Search text or notes").fill("no-such-quote");
	await expect(page.getByText("No matching highlights")).toBeVisible();
	await page.getByRole("button", { name: "Clear filters" }).click();
	await expect(page.getByLabel("Search text or notes")).toHaveValue("");
	await expect(page.getByText(firstQuote)).toBeVisible();
});

test("같은 URL에 자동 생성된 빈 메모도 그리드와 상세에서 하이라이트를 보여준다.", async ({
	page,
}) => {
	resetMockIds();
	const store = new MockSupabaseStore();
	const highlight = store.addHighlight(
		createMockHighlight({ exact_text: "Quote on blank memo page" }),
	);
	store.addMemo(
		createMockMemo({ url: highlight.url, title: "Auto blank memo", memo: "" }),
	);
	await setupSupabaseMocks(page, store);
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});
	const card = page.locator(".memo-item", { hasText: "Auto blank memo" });
	await expect(card).toBeVisible();
	await expect(card.getByText("Highlights (1)")).toBeVisible();
	await card.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByTestId("memo-textarea")).toHaveValue("");
	await dialog
		.getByRole("button", { name: "Other highlights on this page (1)" })
		.click();
	await expect(dialog.getByText(highlight.exact_text)).toBeVisible();
});

test("초기 조회를 기다릴 때 빈 상태 대신 목록 스켈레톤을 보여준다.", async ({
	page,
}) => {
	await setupHighlights(page, 1);
	let releaseHighlight: (() => void) | undefined;
	const highlightGate = new Promise<void>((resolve) => {
		releaseHighlight = resolve;
	});
	let receivedHighlight: (() => void) | undefined;
	const requestReceived = new Promise<void>((resolve) => {
		receivedHighlight = resolve;
	});
	await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (!isHighlightGet(route)) return route.fallback();
		receivedHighlight?.();
		await highlightGate;
		await route.fallback();
	});
	try {
		await gotoHighlights(page);
		await requestReceived;
		await expect(page.locator("main .skeleton-shimmer").first()).toBeVisible();
		await expect(page.getByText("No highlights yet")).toHaveCount(0);
		await expect(page.getByLabel("Search text or notes")).toBeVisible();
	} finally {
		releaseHighlight?.();
	}
	await expect(page.getByText(firstQuote)).toBeVisible();
});

test("초기 조회가 실패하면 오류를 보여주고 재시도로 목록을 회복한다.", async ({
	page,
}) => {
	await setupHighlights(page, 1);
	let shouldFail = true;
	await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (!isHighlightGet(route)) return route.fallback();
		if (!shouldFail) return route.fallback();
		await route.fulfill({
			status: 503,
			contentType: "application/json",
			body: JSON.stringify({ message: "Mock highlight unavailable" }),
		});
	});
	await gotoHighlights(page);
	const retry = page.getByRole("button", { name: "Try again" });
	await expect(retry).toBeVisible({ timeout: 20000 });
	shouldFail = false;
	await retry.click();
	await expect(page.getByText(firstQuote)).toBeVisible();
});

test("추가 페이지가 실패해도 기존 인용을 유지하고 재시도로 이어 붙인다.", async ({
	page,
}) => {
	await setupHighlights(page, 25);
	let shouldFail = true;
	let nextPageRequests = 0;
	await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (!isHighlightGet(route) || !isNextPage(route)) return route.fallback();
		nextPageRequests += 1;
		if (!shouldFail) return route.fallback();
		await route.fulfill({
			status: 503,
			contentType: "application/json",
			body: JSON.stringify({ message: "Mock next page unavailable" }),
		});
	});
	await gotoHighlights(page);
	await expect(page.getByText(firstQuote)).toBeVisible();
	await scrollToNextPage(page);
	await expect(page.getByText(firstQuote)).toBeVisible();
	const retry = page.getByRole("button", { name: "Try again" });
	await expect(retry).toBeVisible({ timeout: 20000 });
	expect(nextPageRequests).toBe(1);
	await page.waitForTimeout(2500);
	expect(nextPageRequests).toBe(1);
	await expect(page.getByText(firstQuote)).toBeVisible();
	shouldFail = false;
	await retry.click();
	await expect(page.getByText(laterQuote)).toBeVisible();
	await expect(page.getByText(firstQuote)).toHaveCount(1);
	expect(nextPageRequests).toBe(2);
});

test("추가 페이지 요청 중에는 스크롤해도 중복 실행하지 않는다.", async ({
	page,
}) => {
	await setupHighlights(page, 25);
	let releasePage: (() => void) | undefined;
	const pageGate = new Promise<void>((resolve) => {
		releasePage = resolve;
	});
	let receivedPage: (() => void) | undefined;
	const pageReceived = new Promise<void>((resolve) => {
		receivedPage = resolve;
	});
	let nextPageRequests = 0;
	await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (!isHighlightGet(route) || !isNextPage(route)) return route.fallback();
		nextPageRequests += 1;
		receivedPage?.();
		await pageGate;
		await route.fallback();
	});
	try {
		await gotoHighlights(page);
		await expect(page.getByText(firstQuote)).toBeVisible();
		await scrollToNextPage(page);
		await pageReceived;
		await scrollToNextPage(page);
		expect(nextPageRequests).toBe(1);
		await expect(page.getByText(firstQuote)).toBeVisible();
	} finally {
		releasePage?.();
	}
	await expect(page.getByText(laterQuote)).toBeVisible();
	expect(nextPageRequests).toBe(1);
});

test("같은 URL의 행만 추가되어 카드가 커져도 다음 페이지를 이어서 불러오고 필터를 초기화한다.", async ({
	page,
}) => {
	await setupHighlights(page, 45);
	let releaseNextPage: (() => void) | undefined;
	const nextPageGate = new Promise<void>((resolve) => {
		releaseNextPage = resolve;
	});
	let nextPageRequests = 0;
	await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (!isHighlightGet(route) || !isNextPage(route)) return route.fallback();
		nextPageRequests += 1;
		if (nextPageRequests === 1) await nextPageGate;
		await route.fallback();
	});
	const cards = page.locator("main article");
	let firstHeight = 0;
	try {
		await gotoHighlights(page);
		await expect(page.getByText(firstQuote)).toBeVisible();
		await expect(page.getByText("Highlight quote 20")).toBeAttached();
		await expect(cards).toHaveCount(1);
		firstHeight = await cards
			.first()
			.evaluate((card) => card.getBoundingClientRect().height);
	} finally {
		releaseNextPage?.();
	}

	await scrollToNextPage(page);
	await expect(page.getByText(laterQuote)).toBeAttached();
	await expect(cards).toHaveCount(1);
	await expect
		.poll(() =>
			cards.first().evaluate((card) => card.getBoundingClientRect().height),
		)
		.toBeGreaterThan(firstHeight);

	await scrollToNextPage(page);
	await expect(page.getByText("Highlight quote 41")).toBeAttached();
	await expect(cards).toHaveCount(1);
	expect(nextPageRequests).toBe(2);

	await page.getByLabel("Search text or notes").fill("Highlight quote 41");
	await expect(page.getByText(firstQuote)).toHaveCount(0);
	await expect(page.getByText("Highlight quote 41")).toBeVisible();
	await page.getByLabel("Search text or notes").fill("");
	await expect(page.getByText(firstQuote)).toBeVisible();
});
