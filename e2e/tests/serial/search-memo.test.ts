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
test.describe("메모 검색 기능", () => {
	const uniqueSearchText = `SearchTest_${Date.now()}`;

	test.beforeEach(async ({ page }) => {
		// 메모를 생성한다.
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await fillMemo(sidePanelPage, uniqueSearchText);

		// 메모 페이지에 접속한다.
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await skipGuide(page);
	});

	test("검색어를 입력하면 해당 메모만 필터링된다.", async ({ page }) => {
		// 검색 입력창에 텍스트 입력
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill(uniqueSearchText);

		// 잠시 대기 (디바운스)
		await page.waitForTimeout(500);

		// 해당 메모가 보이는지 확인
		await expect(page.getByText(uniqueSearchText)).toBeVisible();
	});

	test("검색어를 입력 후 X 버튼을 클릭하면 검색이 초기화된다.", async ({
		page,
	}) => {
		// 검색 입력창에 텍스트 입력
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill(uniqueSearchText);

		// 잠시 대기 (디바운스)
		await page.waitForTimeout(500);

		// X 버튼 클릭
		const clearButton = page.locator('button[aria-label="Clear search"]');
		await clearButton.click();

		// 검색창이 비워졌는지 확인
		await expect(searchInput).toHaveValue("");
	});

	test("검색 대상을 '메모'로 변경하면 메모 내용만 검색된다.", async ({
		page,
	}) => {
		// 검색어 입력
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill(uniqueSearchText);

		// 검색 대상 선택 (메모)
		const selectTrigger = page.locator('[class*="SelectTrigger"]').first();
		await selectTrigger.click();
		await page.getByRole("option", { name: /Memo/i }).click();

		// 잠시 대기 (디바운스)
		await page.waitForTimeout(500);

		// 해당 메모가 보이는지 확인
		await expect(page.getByText(uniqueSearchText)).toBeVisible();
	});
});
