import { expect, test } from "../fixtures/extension";
import {
	cleanupTestData,
	createTestNamespace,
	fillMemo,
	findSidePanelPage,
	getRunId,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

test.describe("SidePanel - Integration", () => {
	// 실제 Supabase에 쓰므로 이 테스트 전용 URL에 메모를 쓰고 afterEach에서 지운다.
	let memoUrl: string;

	test.beforeEach(async ({ page }) => {
		memoUrl = createTestNamespace({
			runId: getRunId(),
			testId: test.info().testId,
		}).memoUrl("side-panel");

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

		// 사이드 패널은 활성 탭의 URL을 따라가 그 URL의 메모를 읽는다. 탭을 이 테스트 전용 URL로 옮기고,
		// 그 URL의 메모 조회가 끝난 뒤에 입력해야 조회 결과가 입력을 덮지 않는다.
		const memoQueryResponse = sidePanelPage.waitForResponse(
			(response) =>
				new URL(response.url()).searchParams.get("url") === `eq.${memoUrl}` &&
				response.ok(),
		);
		await page.goto(memoUrl);
		await memoQueryResponse;

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
