import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("메모 삭제 기능 (Mocked)", () => {
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

	test("메모를 삭제하면, 메모 그리드에서 삭제되며 토스트 메시지가 뜬다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await page.getByTestId("memo-delete-button").click();

		await expect(memoItem).toBeHidden();
		await expect(
			page.getByText("Memo deleted", {
				exact: true,
			}),
		).toBeVisible();
	});

	test("메모를 삭제하면 뜨는 토스트 메시지의 '되돌리기'를 클릭하면 메모를 복구할 수 있다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await page.getByTestId("memo-delete-button").click();

		await page
			.getByText("Undo", {
				exact: true,
			})
			.click();

		await expect(page.getByText(memoText)).toBeVisible();
	});
});
