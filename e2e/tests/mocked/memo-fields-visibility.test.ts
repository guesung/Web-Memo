import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/**
 * 느낀 점·액션 아이템은 설정에서 켠 경우에만 보인다.
 * 내용이 이미 저장돼 있어도 설정이 꺼져 있으면 목록 카드와 상세 입력란 모두에 나오지 않는다.
 */
test.describe("메모 필드 노출 설정 (Mocked)", () => {
	let store: MockSupabaseStore;
	let memoText: string;
	let impressionText: string;
	let actionItemText: string;

	/**
	 * 느낀 점·액션 아이템이 이미 채워진 메모 하나를 심고 메모 목록까지 이동한다.
	 * setting 행은 각 테스트가 setupStore 호출 전에 store.setSetting으로 정한다.
	 */
	const setupPage = async (
		page: Page,
		setting: ReturnType<typeof createMockSetting> | null,
	) => {
		resetMockIds();
		store = new MockSupabaseStore();
		store.setSetting(setting);

		const uniqueSuffix = Date.now();
		memoText = `Test Memo ${uniqueSuffix}`;
		impressionText = `Impression ${uniqueSuffix}`;
		actionItemText = `ActionItem ${uniqueSuffix}`;

		store.addMemo(
			createMockMemo({
				memo: memoText,
				title: memoText,
				impression: impressionText,
				actionItem: actionItemText,
			}),
		);

		await setupSupabaseMocks(page, store);

		await login(page);
		await skipGuide(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	};

	test("설정 행이 없는 신규 사용자는 두 필드가 모두 꺼진 상태로 보인다.", async ({
		page,
	}) => {
		await setupPage(page, null);

		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await expect(memoItem).toBeVisible();
		await expect(memoItem).not.toContainText(impressionText);
		await expect(memoItem).not.toContainText(actionItemText);

		await memoItem.click();
		await expect(page.getByTestId("memo-textarea")).toHaveValue(memoText);
		await expect(page.getByTestId("impression-textarea")).toHaveCount(0);
		await expect(page.getByTestId("action-item-textarea")).toHaveCount(0);
	});

	test("설정이 꺼져 있으면 내용이 저장돼 있어도 목록 카드에 보이지 않는다.", async ({
		page,
	}) => {
		await setupPage(
			page,
			createMockSetting({ show_impression: false, show_action_item: false }),
		);

		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await expect(memoItem).toBeVisible();
		await expect(memoItem).not.toContainText(impressionText);
		await expect(memoItem).not.toContainText(actionItemText);
	});

	test("설정이 꺼져 있으면 상세 다이얼로그에 입력란이 뜨지 않는다.", async ({
		page,
	}) => {
		await setupPage(
			page,
			createMockSetting({ show_impression: false, show_action_item: false }),
		);

		await page.locator(".memo-item", { hasText: memoText }).click();

		await expect(page.getByTestId("memo-textarea")).toHaveValue(memoText);
		await expect(page.getByTestId("impression-textarea")).toHaveCount(0);
		await expect(page.getByTestId("action-item-textarea")).toHaveCount(0);
	});

	test("설정을 켜면 목록 카드와 상세 입력란에 모두 보인다.", async ({
		page,
	}) => {
		await setupPage(
			page,
			createMockSetting({ show_impression: true, show_action_item: true }),
		);

		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await expect(memoItem).toContainText(impressionText);
		await expect(memoItem).toContainText(actionItemText);

		await memoItem.click();
		await expect(page.getByTestId("impression-textarea")).toHaveValue(
			impressionText,
		);
		await expect(page.getByTestId("action-item-textarea")).toHaveValue(
			actionItemText,
		);
	});

	test("느낀 점만 켜면 액션 아이템은 계속 숨겨진다.", async ({ page }) => {
		await setupPage(
			page,
			createMockSetting({ show_impression: true, show_action_item: false }),
		);

		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await expect(memoItem).toContainText(impressionText);
		await expect(memoItem).not.toContainText(actionItemText);

		await memoItem.click();
		await expect(page.getByTestId("impression-textarea")).toHaveValue(
			impressionText,
		);
		await expect(page.getByTestId("action-item-textarea")).toHaveCount(0);
	});
});
