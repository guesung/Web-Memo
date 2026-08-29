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

		// Click overlay area (outside dialog content) to dismiss only the dropdown
		await page.mouse.click(10, 10);

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

	test("드롭다운을 Escape로 닫은 직후 다시 Escape를 누르면, Dialog가 닫힌다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		// Radix는 닫히는 애니메이션 동안 포퍼 래퍼를 붙잡아 둔다. 그 사이에 누른
		// 두 번째 Escape가 삼켜지면 안 되므로, 드롭다운이 사라지길 기다리지 않고
		// 곧바로 다시 누른다. 기다리면 애니메이션 창을 지나쳐 회귀를 못 잡는다.
		await page.keyboard.press("Escape");
		await page.keyboard.press("Escape");

		await expect(dialog).toBeHidden();
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
