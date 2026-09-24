import { expect, test } from "../fixtures";
import {
	cleanupTestData,
	E2E_SIDE_PANEL_HOST_URL,
	fillMemo,
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

test.describe("SidePanel - Integration", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls: [E2E_SIDE_PANEL_HOST_URL] });
	});

	test("사이드 패널에서 메모를 입력하면, 저장이 되어 새로고침을 해도 메모를 확인할 수 있다.", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
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
