import { expect, test } from "../fixtures";
import {
	cleanupTestData,
	E2E_MEMO_URL_PREFIX,
	fillMemo,
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

test.describe("SidePanel - Integration", () => {
	// 실제 Supabase에 쓰므로 afterEach에서 지울 URL을 여기 모아 둔다.
	let memoUrl = "";

	test.beforeEach(async ({ page }) => {
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls: [memoUrl] });
	});

	test("사이드 패널에서 메모를 입력하면, 저장이 되어 새로고침을 해도 메모를 확인할 수 있다.", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		// 메모가 붙는 URL이 곧 정리 키다. 로그인 직후의 메모 목록 페이지에 그대로 쓰면
		// 사람이 손으로 남긴 메모와 구분할 수 없어 정리 대상을 특정하지 못한다.
		memoUrl = `${E2E_MEMO_URL_PREFIX}create-${Date.now()}`;
		await page.goto(memoUrl);
		await sidePanelPage.waitForTimeout(1000);

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
