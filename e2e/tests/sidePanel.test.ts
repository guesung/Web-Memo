import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function fillMemo(page: Page, text: string) {
	page.locator("#memo-textarea").fill(text);
	await expect(page.locator("#memo-textarea")).toHaveValue(text);
}

test.describe("SidePanel", () => {
	test.beforeEach(async ({ loginedPage }) => {
		await loginedPage.goto("https://blog.toss.im/article/toss-team-culture");
		await loginedPage.locator("#OPEN_SIDE_PANEL_BUTTON").click();

		await loginedPage.waitForTimeout(1000);
	});

	test("사이드 패널에서 메모를 입력하면, 메모를 확인할 수 있다.", async ({
		sidePanelPage,
	}) => {
		await fillMemo(sidePanelPage, String(new Date()));
	});

	test("사이드 패널에서 메모를 입력하면, 저장이 되어 새로고침을 해도 메모를 확인할 수 있다.", async ({
		sidePanelPage,
	}) => {
		const text = String(new Date());
		await fillMemo(sidePanelPage, text);

		await sidePanelPage.waitForTimeout(1000);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
	});
});
