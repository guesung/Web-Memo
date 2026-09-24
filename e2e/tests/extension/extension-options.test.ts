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

	test("카테고리 자동 적용을 끄면 자동 저장되어 새로 열어도 꺼진 채로 남는다.", async ({
		page,
	}) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		await expect(optionsPage).toHaveURL(/\/(ko|en)\/settings#extension$/);
		const autoApplyCategorySwitch = optionsPage.locator("#auto-category");
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"checked",
		);

		await autoApplyCategorySwitch.click();
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"unchecked",
		);
		await expect(
			optionsPage.locator('output[data-status="saved"]'),
		).toBeAttached();

		await optionsPage.reload();
		await expect(optionsPage.locator("#auto-category")).toHaveAttribute(
			"data-state",
			"unchecked",
		);
	});

	test("연속 변경 후 마지막 선택이 저장된다.", async ({ page }) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));

		await expect(optionsPage).toHaveURL(/\/(ko|en)\/settings#extension$/);
		const autoApplyCategorySwitch = optionsPage.locator("#auto-category");
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"checked",
		);

		await autoApplyCategorySwitch.click();
		await autoApplyCategorySwitch.click();
		await autoApplyCategorySwitch.click();
		await expect(autoApplyCategorySwitch).toHaveAttribute(
			"data-state",
			"unchecked",
		);
		await expect(
			optionsPage.locator('output[data-status="saved"]'),
		).toBeAttached();

		await optionsPage.reload();
		await expect(optionsPage.locator("#auto-category")).toHaveAttribute(
			"data-state",
			"unchecked",
		);
	});
});
