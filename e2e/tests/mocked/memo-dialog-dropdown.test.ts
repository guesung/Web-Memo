import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("MemoDialog 드롭다운 클릭 시 다이얼로그 닫힘 버그 수정", () => {
	let store: MockSupabaseStore;
	let memoText: string;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		memoText = `Test Memo ${Date.now()}`;
		const category = createMockCategory({ name: "Test Category" });
		store.addCategory(category);

		const mockMemo = createMockMemo({
			memo: memoText,
			title: memoText,
			category_id: category.id,
		});
		store.addMemo(mockMemo);

		await setupSupabaseMocks(page, store);

		await login(page);
		await skipGuide(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("드롭다운 메뉴 외부 클릭 시 다이얼로그가 닫히지 않아야 한다", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		await expect(page.getByTestId("memo-textarea")).toBeVisible();

		await page.getByTestId("memo-option").click();

		const dropdownContent = page.locator('[role="menu"]');
		await expect(dropdownContent).toBeVisible();

		const dialogOverlay = page.locator('[data-state="open"].fixed.inset-0');
		await dialogOverlay.click({ position: { x: 10, y: 10 } });

		await expect(dropdownContent).not.toBeVisible();

		await expect(page.getByTestId("memo-textarea")).toBeVisible();
	});

	test("드롭다운 서브메뉴(카테고리 변경) 외부 클릭 시 다이얼로그가 닫히지 않아야 한다", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		await expect(page.getByTestId("memo-textarea")).toBeVisible();

		await page.getByTestId("memo-option").click();

		const dropdownContent = page.locator('[role="menu"]');
		await expect(dropdownContent).toBeVisible();

		const categorySubmenu = page.getByRole("menuitem", {
			name: /category|카테고리/i,
		});
		await categorySubmenu.hover();

		await page.waitForTimeout(300);

		const dialogOverlay = page.locator('[data-state="open"].fixed.inset-0');
		await dialogOverlay.click({ position: { x: 10, y: 10 } });

		await expect(page.getByTestId("memo-textarea")).toBeVisible();
	});

	test("다이얼로그 overlay 직접 클릭 시에는 다이얼로그가 닫혀야 한다", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		await expect(page.getByTestId("memo-textarea")).toBeVisible();

		const dialogOverlay = page.locator('[data-state="open"].fixed.inset-0');
		await dialogOverlay.click({ position: { x: 10, y: 10 }, force: true });

		await expect(page.getByTestId("memo-textarea")).not.toBeVisible();
	});
});
