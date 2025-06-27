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

test.describe("메모 수정 기능", () => {
	let memoText: string;

	test.beforeAll(async ({ page }) => {
		// 메모를 생성한다.
		await login(page);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		memoText = String(new Date());
		await fillMemo(sidePanelPage, memoText);
	});
	test.beforeEach(async ({ page }) => {
		// 메모 페이지에 접속한다.
		await login(page);
		await page.goto(`${LANGUAGE}${PATHS.memos}`);
		await skipGuide(page);
	});

	test("메모를 수정할 수 있다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		const newMemoText = String(new Date());

		await page.getByTestId("memo-textarea").fill(newMemoText);
		await page.getByTestId("memo-save-button").click();

		await expect(page.getByText(newMemoText)).toBeVisible();
	});
});
