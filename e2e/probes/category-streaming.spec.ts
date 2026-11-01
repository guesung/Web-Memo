import { test as base, expect } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import {
	MockSupabaseStore,
	setupSupabaseMocks,
	supabaseGuardFixture,
} from "../tests/lib/mocks";

const fixture = process.env.WM_DIAG_CATEGORY_FIXTURE;
const gateMs = Number(process.env.WM_DIAG_DELAY_CATEGORY_MS);
if (fixture !== "success" && fixture !== "empty") {
	throw new Error("WM_DIAG_CATEGORY_FIXTURE must be success or empty");
}
if (gateMs !== 3000 && gateMs !== 5000) {
	throw new Error("WM_DIAG_DELAY_CATEGORY_MS must be 3000 or 5000");
}

const test = base.extend<{ supabaseGuard: undefined }>({
	supabaseGuard: [supabaseGuardFixture, { auto: true }],
});

test("category gate 중 shell과 memo GET이 먼저 시작하고 완료 후 캐시를 공유한다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	let browserCategoryGets = 0;
	let browserMemoGets = 0;
	page.on("request", (request) => {
		const pathname = new URL(request.url()).pathname;
		if (request.method() === "GET" && pathname === "/rest/v1/category")
			browserCategoryGets += 1;
		if (request.method() === "GET" && pathname === "/rest/v1/memo")
			browserMemoGets += 1;
	});
	const navigation = page.goto(`/ko${PATHS.memos}`, {
		waitUntil: "domcontentloaded",
	});
	const pendingCategory = page.locator('#category[aria-busy="true"]');
	await expect(pendingCategory).toBeVisible({ timeout: 2_000 });
	await expect(page.locator("main form input").first()).toBeVisible();
	await expect
		.poll(() => browserMemoGets, { timeout: 2_000 })
		.toBeGreaterThan(0);
	expect(browserCategoryGets).toBe(0);
	await navigation;
	await expect(pendingCategory).toHaveCount(0);
	const category = page.locator("#category");
	await expect(
		category.getByRole("button", { name: "카테고리 추가하기" }),
	).toBeVisible();
	if (fixture === "success") {
		await expect(
			category.getByRole("link", { name: /Streaming category/ }),
		).toBeVisible();
	} else if (fixture === "empty") {
		await expect(
			category.getByRole("link", { name: /Streaming category/ }),
		).toHaveCount(0);
	}
	expect(browserCategoryGets).toBe(0);
});

test("모바일 Sheet의 category 슬롯만 pending이고 메뉴를 닫을 수 있다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await page.setViewportSize({ width: 390, height: 844 });
	const navigation = page.goto(`/ko${PATHS.memos}`, {
		waitUntil: "domcontentloaded",
	});
	await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible({
		timeout: 2_000,
	});
	await page.locator('[data-sidebar="trigger"]').click();
	const sheet = page.locator('[role="dialog"][data-sidebar="sidebar"]');
	await expect(sheet).toBeVisible();
	await expect(sheet.locator('#category[aria-busy="true"]')).toBeVisible();
	const width = await sheet.evaluate(
		(element) => element.getBoundingClientRect().width,
	);
	expect(width).toBe(288);
	await page.keyboard.press("Escape");
	await expect(sheet).toBeHidden();
	await navigation;
});

test("다크 데스크톱 category 슬롯의 치수와 내부 이동 중 pending 공유를 유지한다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await page.addInitScript(() => localStorage.setItem("theme", "dark"));
	let browserCategoryGets = 0;
	page.on("request", (request) => {
		if (
			request.method() === "GET" &&
			new URL(request.url()).pathname === "/rest/v1/category"
		)
			browserCategoryGets += 1;
	});
	const navigation = page.goto(`/ko${PATHS.memos}`, {
		waitUntil: "domcontentloaded",
	});
	const sidebar = page.locator('[data-sidebar="sidebar"]');
	const category = sidebar.locator('#category[aria-busy="true"]');
	await expect(category).toBeVisible({ timeout: 2_000 });
	await expect(page.locator("html")).toHaveClass(/dark/);
	await expect(async () => {
		const dimensions = await category.evaluate((element) => {
			const title = element.querySelector('[data-sidebar="group-label"]');
			const content = element.querySelector('[data-sidebar="group-content"]');
			const add = content?.firstElementChild;
			const rows = content?.querySelector("ul")?.children;
			return {
				sidebarWidth:
					element
						.closest('[data-sidebar="sidebar"]')
						?.parentElement?.getBoundingClientRect().width ?? null,
				titleHeight: title?.getBoundingClientRect().height ?? null,
				addHeight: add?.getBoundingClientRect().height ?? null,
				rowHeights: rows
					? Array.from(rows, (row) => row.getBoundingClientRect().height)
					: [],
			};
		});
		expect(dimensions).toEqual({
			sidebarWidth: 192,
			titleHeight: 32,
			addHeight: 48,
			rowHeights: [32, 32, 32],
		});
	}).toPass({ timeout: 2_000, intervals: [50, 100, 200] });
	expect(await category.isVisible()).toBe(true);
	await sidebar.locator(`a[href$="${PATHS.memosWish}"]`).click();
	await expect(page).toHaveURL(new RegExp(`${PATHS.memosWish}$`));
	expect(browserCategoryGets).toBe(0);
	await navigation;
	await expect(sidebar.locator('#category[aria-busy="true"]')).toHaveCount(0);
	await expect(sidebar.locator("#category")).toBeVisible();
	expect(browserCategoryGets).toBe(0);
});
