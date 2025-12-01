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
test.describe("위시리스트 기능", () => {
	let memoText: string;

	test.beforeEach(async ({ page }) => {
		// 메모를 생성한다.
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		memoText = `WishTest_${Date.now()}`;
		await fillMemo(sidePanelPage, memoText);

		// 메모 페이지에 접속한다.
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await skipGuide(page);
	});

	test("사이드바에서 위시리스트 메뉴를 클릭하면 위시리스트 페이지로 이동한다.", async ({
		page,
	}) => {
		// 사이드바에서 Wish List 클릭
		await page.getByText(/My wishlist/i).click();
		await page.waitForURL(/isWish=true/);

		await expect(page).toHaveURL(/isWish=true/);
	});

	test("위시리스트 페이지에서 메모 페이지로 돌아갈 수 있다.", async ({
		page,
	}) => {
		// 위시리스트 페이지로 이동
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memosWish}`,
			regexp: /isWish=true/,
		});

		// 사이드바에서 Memos 클릭
		await page.getByText(/^Memos$/i).click();
		await page.waitForTimeout(500);

		// URL에 isWish가 없어야 함
		const url = page.url();
		expect(url.includes("isWish=true")).toBeFalsy();
	});
});
