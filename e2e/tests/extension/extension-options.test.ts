import { getExtensionUrl } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { login, skipGuide } from "../lib";
import {
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("확장 옵션 페이지", () => {
	test.beforeEach(async ({ page }) => {
		// 옵션 페이지의 메모 필드 설정(MemoFieldsOption)이 setting을 읽는다. 로그인 뒤 메모 화면의 목록과 함께
		// 컨텍스트 단위 목으로 받아, 옵션 페이지처럼 테스트가 나중에 여는 확장 페이지의 요청도 실서버로 가지 않게 한다.
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting());
		await setupSupabaseMocks(page, store);

		// 옵션 페이지의 메모 필드 설정이 Supabase 세션을 요구한다.
		// 웹에서 로그인하면 background가 확장 쪽 세션까지 맞춘다.
		await login(page);
		await skipGuide(page);
	});

	test("응답 언어를 변경하면 자동 저장되어 새로 열어도 유지된다.", async ({
		page,
	}) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		// background가 설치 때 브라우저 UI 언어로 기본값을 채우므로(CI는 English), 이미 고른 값을
		// 다시 고르면 저장이 일어나지 않는다. 지금 값과 다른 언어를 골라야 저장을 확인할 수 있다.
		const languageTrigger = optionsPage.locator("#response-language");
		await expect(languageTrigger).toHaveText(/English|한국어/);
		const currentLanguage = (await languageTrigger.textContent()) ?? "";
		const nextLanguage = currentLanguage.includes("English")
			? "한국어"
			: "English";

		await languageTrigger.click();
		await optionsPage.getByRole("option", { name: nextLanguage }).click();
		await expect(
			optionsPage.getByText(/^(Saved|저장했어요)$/).last(),
		).toBeVisible();

		await optionsPage.reload();
		await expect(optionsPage.locator("#response-language")).toContainText(
			nextLanguage,
		);
	});

	test("카테고리 자동 적용 설정은 표시하지 않는다.", async ({ page }) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		await expect(optionsPage.locator("#response-language")).toBeVisible();
		await expect(optionsPage.locator("#auto-apply-category")).toHaveCount(0);
	});
});
