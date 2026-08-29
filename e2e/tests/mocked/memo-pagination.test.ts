import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 앱의 한 장 크기(useMemosInfiniteQuery의 PAGE_SIZE). */
const PAGE_SIZE = 20;
const SEEDED_COUNT = 25;

test.describe("메모 무한 스크롤 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();

		for (let order = 1; order <= SEEDED_COUNT; order++) {
			store.addMemo(
				createMockMemo({
					title: `메모 ${String(order).padStart(2, "0")}`,
					memo: `본문 ${order}`,
				}),
			);
		}

		await setupSupabaseMocks(page, store);

		await login(page);
		await skipGuide(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("첫 화면에는 한 장만 그리고, 총 개수는 전체를 보여준다.", async ({
		page,
	}) => {
		await expect(page.getByText(`${SEEDED_COUNT} memos`)).toBeVisible();
		await expect(page.locator(".memo-item")).toHaveCount(PAGE_SIZE);
		await expect(
			page.locator(".memo-item", { hasText: "메모 25" }),
		).toHaveCount(0);
	});

	test("끝까지 스크롤하면 다음 장이 이어 붙고, 같은 메모가 반복되지 않는다.", async ({
		page,
	}) => {
		await expect(page.locator(".memo-item")).toHaveCount(PAGE_SIZE);

		await page.mouse.move(640, 400);
		for (let scroll = 0; scroll < 10; scroll++) {
			await page.mouse.wheel(0, 2000);
			const count = await page.locator(".memo-item").count();
			if (count > PAGE_SIZE) {
				break;
			}
		}

		await expect(page.locator(".memo-item")).toHaveCount(SEEDED_COUNT);
		await expect(
			page.locator(".memo-item", { hasText: "메모 25" }),
		).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "메모 01" }),
		).toHaveCount(1);
	});
});
