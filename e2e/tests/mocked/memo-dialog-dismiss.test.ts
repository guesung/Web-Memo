import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("MemoDialog dismiss 동작 (Mocked)", () => {
	let store: MockSupabaseStore;
	let memoText: string;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		memoText = `Test Memo ${Date.now()}`;
		const mockMemo = createMockMemo({ memo: memoText, title: memoText });
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

	test("드롭다운이 열린 상태에서 외부를 클릭하면, 드롭다운만 닫히고 Dialog는 유지된다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		await dialog.getByTestId("memo-textarea").click();

		await expect(page.getByTestId("memo-delete-button")).toBeHidden();
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
	});

	test("드롭다운이 열린 상태에서 Escape를 누르면, 드롭다운만 닫히고 Dialog는 유지된다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		await page.keyboard.press("Escape");

		await expect(page.getByTestId("memo-delete-button")).toBeHidden();
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
	});

	test("닫기 버튼을 클릭하면, Dialog가 정상적으로 닫힌다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-close-button").click();

		await expect(dialog).toBeHidden();
	});

	test("Escape를 누르면, Dialog가 정상적으로 닫힌다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-close-button").focus();
		await page.keyboard.press("Escape");

		await expect(dialog).toBeHidden();
	});
});
