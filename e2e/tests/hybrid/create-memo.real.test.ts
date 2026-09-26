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
	waitForSidePanelMemoQuery,
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
		const memoQueryResponse = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: memoUrl,
		});
		await page.goto(memoUrl);
		await memoQueryResponse;

		const text = String(new Date());
		// fillMemo가 저장 응답과 성공 처리까지 기다리므로 바로 새로고침해도 된다.
		await fillMemo(sidePanelPage, text);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
	});
});
