import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "./fixtures";
import {
	fillMemo,
	findSidePanelPage,
	LANGUAGE,
	login,
	openSidePanel,
	skipGuide,
} from "./lib";

test.describe("메모 그리드", () => {
	let memoText: string;
	test.beforeEach(async ({ page }) => {
		// 메모를 생성한다.
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		memoText = String(new Date());
		await fillMemo(sidePanelPage, memoText);

		// 메모 페이지에 접속한다.
		await page.goto(`${LANGUAGE}${PATHS.memos}`);
	});
	test("메모 페이지에 접속하면, 메모를 확인할 수 있다.", async ({ page }) => {
		await expect(page.getByText(memoText)).toBeVisible();
	});
	test("메모를 누르면, 메모 상세 페이지가 열린다.", async ({ page }) => {
		await page.getByText(memoText).click();
		await expect(page.getByTestId("memo-textarea")).toHaveValue(memoText);
	});
});
