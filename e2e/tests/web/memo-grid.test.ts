import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("메모 그리드 (Mocked)", () => {
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

	test("메모 페이지에 접속하면, 메모를 확인할 수 있다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await expect(memoItem).toBeVisible();
	});

	test("메모를 누르면, 메모 상세 페이지가 열린다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();
		await expect(page.getByTestId("memo-textarea")).toHaveValue(memoText);
	});
});
