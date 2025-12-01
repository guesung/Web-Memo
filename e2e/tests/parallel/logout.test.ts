import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";

test.describe.configure({ mode: "parallel" });
test.describe("로그아웃 기능", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await skipGuide(page);
	});

	test("로그인 후 아바타를 클릭하면 로그아웃 메뉴가 표시된다.", async ({
		page,
	}) => {
		// 아바타 클릭
		const avatar = page.locator("img[alt='avatar']");
		await avatar.click();

		// 로그아웃 버튼이 표시되는지 확인
		await expect(page.getByText(/Sign out/i)).toBeVisible();
	});

	test("로그아웃 버튼을 클릭하면 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		// 아바타 클릭
		const avatar = page.locator("img[alt='avatar']");
		await avatar.click();

		// 로그아웃 버튼 클릭
		await page.getByText(/Sign out/i).click();

		// 로그인 페이지로 이동했는지 확인
		await page.waitForURL(new RegExp(PATHS.login));
		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});
});
