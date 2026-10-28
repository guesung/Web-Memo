import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 패널을 열고 메모를 불러오면 메모 칸에 바로 쓸 수 있게 커서가 내용 끝에 들어간다. */
test("메모를 불러오면 메모 칸에 커서가 들어간다 (Mocked)", async ({
	page,
	context,
}) => {
	const url = "https://example.com/autofocus";
	const memo = "불러온 메모";
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ url, memo }));
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Autofocus test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	await page.goto(url);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	const memoTextarea = sidePanelPage.locator("#memo-textarea");

	await expect(memoTextarea).toHaveValue(memo);
	await expect(memoTextarea).toBeFocused();
	await expect
		.poll(() =>
			memoTextarea.evaluate((element: HTMLTextAreaElement) => [
				element.selectionStart,
				element.selectionEnd,
			]),
		)
		.toEqual([memo.length, memo.length]);
});
