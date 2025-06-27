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

test.describe("메모 삭제 기능", () => {
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
	test("메모를 삭제하면, 메모 그리드에서 삭제된다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await page.getByTestId("memo-delete-button").click();

		await expect(memoItem).toBeHidden();
	});

	test("메모를 삭제하면, 토스트 메시지가 뜬다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await page.getByTestId("memo-delete-button").click();

		await expect(
			page.getByText("Memo deleted", {
				exact: true,
			}),
		).toBeVisible();
	});
	test("메모를 삭제하면 뜨는 토스트 메시지의 '되돌리기'를 클릭하면 메모를 복구할 수 있다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await page.getByTestId("memo-delete-button").click();

		await page
			.getByText("Undo", {
				exact: true,
			})
			.click();

		await expect(page.getByText(memoText)).toBeVisible();
	});
});
