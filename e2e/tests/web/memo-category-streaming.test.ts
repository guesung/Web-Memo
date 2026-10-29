import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

test("카테고리 준비 후 사이드바를 유지하고 새로고침에도 브라우저 중복 조회를 하지 않는다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	let browserCategoryGets = 0;
	page.on("request", (request) => {
		if (
			request.method() === "GET" &&
			new URL(request.url()).pathname.endsWith("/rest/v1/category")
		) {
			browserCategoryGets += 1;
		}
	});
	await gotoSafely({
		page,
		url: `/ko${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});
	const sidebar = page.locator('[data-sidebar="sidebar"]');
	await expect(sidebar.locator("#category")).toBeVisible();
	await expect(
		sidebar.getByRole("button", { name: "카테고리 추가하기" }),
	).toBeVisible();
	await page.reload();
	await expect(sidebar.locator("#category")).toBeVisible();
	await expect(
		sidebar.getByRole("button", { name: "카테고리 추가하기" }),
	).toBeVisible();
	expect(browserCategoryGets).toBe(0);
});

test("모바일 메뉴에서도 카테고리 섹션과 닫기 동작을 유지한다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoSafely({
		page,
		url: `/ko${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});
	const menu = page.locator('[role="dialog"][data-sidebar="sidebar"]');
	await expect(menu).toHaveCount(0);
	await page.locator('[data-sidebar="trigger"]').click();
	await expect(menu).toBeVisible();
	await expect(menu.locator("#category")).toBeVisible();
	await expect(
		menu.getByRole("button", { name: "카테고리 추가하기" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(menu).toHaveCount(0);
});
