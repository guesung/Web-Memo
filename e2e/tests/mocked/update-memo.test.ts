import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("메모 수정 기능 (Mocked)", () => {
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

	test("메모를 수정할 수 있다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		const newMemoText = `Updated Memo ${Date.now()}`;

		const patchResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "PATCH",
		);

		const textarea = page.getByTestId("memo-textarea");
		await textarea.evaluate((el, text) => {
			const nativeTextAreaValueSetter =
				Object.getOwnPropertyDescriptor(
					window.HTMLTextAreaElement.prototype,
					"value",
				)?.set;
			nativeTextAreaValueSetter?.call(el, text);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, newMemoText);

		await patchResponsePromise;

		await page.waitForResponse(
			(resp) =>
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "GET",
		);

		await page.getByTestId("memo-close-button").click();

		const newMemoItem = page.locator(".memo-item", {
			hasText: newMemoText,
		});

		await newMemoItem.click();

		await expect(page.getByTestId("memo-textarea")).toHaveValue(newMemoText);
	});
});
