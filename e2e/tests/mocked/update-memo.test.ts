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

		// 원래 메모가 채워지기 전에 값을 흘리면 react-hook-form이 변경을 구독하기 전이라
		// 디바운스 저장이 아예 걸리지 않는다. 로드가 끝난 뒤에 입력한다.
		const textarea = page.getByTestId("memo-textarea");
		await expect(textarea).toHaveValue(memoText);

		const patchResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "PATCH",
		);

		await textarea.evaluate((el, text) => {
			const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
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
