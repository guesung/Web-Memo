import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";

test.describe.configure({ mode: "serial" });
test.describe("설정 페이지 기능", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await skipGuide(page);
	});

	test("설정 페이지에 접속할 수 있다.", async ({ page }) => {
		// 설정 버튼 클릭
		await page.locator("#settings").click();
		await page.waitForURL(new RegExp(PATHS.memosSetting));

		await expect(page).toHaveURL(new RegExp(PATHS.memosSetting));
	});

	test("카테고리를 추가할 수 있다.", async ({ page }) => {
		// 설정 페이지로 이동
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});

		// 카테고리 추가 버튼 클릭
		const addCategoryButton = page.getByRole("button", {
			name: /Add Category/i,
		});
		await addCategoryButton.click();

		// 토스트 메시지 확인
		await expect(page.getByText("Changes saved").first()).toBeVisible();
	});

	test("언어 설정을 변경할 수 있다.", async ({ page }) => {
		// 설정 페이지로 이동
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});

		// 언어 선택 드롭다운이 존재하는지 확인
		const languageSelect = page.locator('[class*="SelectTrigger"]').first();
		await expect(languageSelect).toBeVisible();
	});
});
