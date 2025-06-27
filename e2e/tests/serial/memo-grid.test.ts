import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import {
	fillMemo,
	findSidePanelPage,
	gotoSafely,
	LANGUAGE,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

test.describe.configure({ mode: "serial" });
test.describe("메모 그리드", () => {
	let memoText: string;
	test.beforeEach(async ({ page }) => {
		await login(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await skipGuide(page);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		memoText = String(new Date());
		await fillMemo(sidePanelPage, memoText);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});
	test("메모 페이지에 접속하면, 메모를 확인할 수 있다.", async ({ page }) => {
		await expect(page.getByText(memoText)).toBeVisible();
	});
	test("메모를 누르면, 메모 상세 페이지가 열린다.", async ({ page }) => {
		await page.getByText(memoText).click();
		await expect(page.getByTestId("memo-textarea")).toHaveValue(memoText);
	});
});
