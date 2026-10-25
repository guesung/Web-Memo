import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 검색 단축키(/ · ⌘K)와 목록 J/K/Enter 이동. */
test.describe("메모 목록 키보드 단축키 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting());
		for (let index = 0; index < 4; index++) {
			store.addMemo(
				createMockMemo({
					title: `단축키 메모 ${index}`,
					memo: `본문 ${index}`,
				}),
			);
		}

		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await expect(page.locator(".memo-item").first()).toBeVisible();
	});

	test("/를 누르면 검색창으로 가고, 검색창에서 /는 글자로 입력되며 Esc로 빠져나온다.", async ({
		page,
	}) => {
		const search = page.getByPlaceholder("Search memos");

		await page.keyboard.press("/");
		await expect(search).toBeFocused();
		await expect(search).toHaveValue("");

		await page.keyboard.type("a/b");
		await expect(search).toHaveValue("a/b");

		await page.keyboard.press("Escape");
		await expect(search).not.toBeFocused();
		await expect(search).toHaveValue("a/b");
	});

	test("⌘K(Ctrl+K)를 누르면 검색창으로 간다.", async ({ page }) => {
		await page.keyboard.press("ControlOrMeta+k");

		await expect(page.getByPlaceholder("Search memos")).toBeFocused();
	});

	test("J/K로 카드를 옮기고 Enter로 상세를 연다.", async ({ page }) => {
		const cards = page.locator('.memo-item[role="button"]');

		await page.keyboard.press("j");
		await expect(cards.nth(0)).toBeFocused();
		await page.keyboard.press("j");
		await page.keyboard.press("j");
		await expect(cards.nth(2)).toBeFocused();
		await page.keyboard.press("k");
		await expect(cards.nth(1)).toBeFocused();

		const memoId = await cards.nth(1).getAttribute("id");
		await page.keyboard.press("Enter");

		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`[?&]id=${memoId}`));
	});
});
