import { expect, test } from "../fixtures";
import { getExtensionUrl, login, skipGuide } from "../lib";

test.describe("확장 옵션 페이지", () => {
	test.beforeEach(async ({ page }) => {
		// 옵션 페이지의 메모 필드 설정이 Supabase 세션을 요구한다.
		// 웹에서 로그인하면 background가 확장 쪽 세션까지 맞춘다.
		await login(page);
		await skipGuide(page);
	});

	test("카테고리 자동 적용을 끄고 저장하면, 새로 열어도 꺼진 채로 남는다.", async ({
		page,
	}) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		const autoApplyCategorySwitch = optionsPage.locator("#auto-apply-category");
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"checked",
		);

		await autoApplyCategorySwitch.click();
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"unchecked",
		);

		// 확장 문구는 브라우저 UI 언어를 따라간다. 두 로케일을 모두 받는다.
		await optionsPage.getByRole("button", { name: /^(Save|저장)$/ }).click();
		// 토스트 문구는 본문과 스크린리더 안내 영역 두 곳에 실린다.
		await expect(
			optionsPage.getByText(/Settings saved|설정을 저장했어요/).first(),
		).toBeVisible();

		await optionsPage.reload();

		await expect(optionsPage.locator("#auto-apply-category")).toHaveAttribute(
			"data-state",
			"unchecked",
		);
	});

	test("저장하지 않고 새로 열면, 바꾼 값이 남지 않는다.", async ({ page }) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		await optionsPage.locator("#auto-apply-category").click();
		await expect(optionsPage.locator("#auto-apply-category")).toHaveAttribute(
			"data-state",
			"unchecked",
		);

		await optionsPage.reload();

		await expect(optionsPage.locator("#auto-apply-category")).toHaveAttribute(
			"data-state",
			"checked",
		);
	});
});
