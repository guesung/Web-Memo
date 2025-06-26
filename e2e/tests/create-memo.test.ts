import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "./fixtures";
import {
	fillMemo,
	findSidePanelPage,
	LANGUAGE,
	login,
	openSidePanel,
} from "./lib";

test.describe("메모 생성 기능", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await openSidePanel(page);
	});

	test("사이드 패널에서 메모를 저장하면, 웹사이트에서 메모를 확인할 수 있다.", async ({
		page,
	}) => {
		const text = String(new Date());

		const sidePanelPage = await findSidePanelPage(page);
		await fillMemo(sidePanelPage, text);

		await page.goto(`${LANGUAGE}${PATHS.memos}`);
		await expect(page.getByText(text)).toBeVisible();
	});
});
