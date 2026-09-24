import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 세로 스크롤이 생길 만큼의 메모 수 */
const ENOUGH_MEMOS_TO_SCROLL = 30;

/**
 * 현재 페이지에 표식을 심는다. 클라이언트 네비게이션이면 살아남고,
 * 문서를 다시 받는 하드 네비게이션이면 window가 새로 만들어져 사라진다.
 */
const markWindow = (page: Page) =>
	page.evaluate(() => {
		(window as unknown as { __navProbe?: boolean }).__navProbe = true;
	});

const isWindowMarkAlive = (page: Page) =>
	page.evaluate(
		() => (window as unknown as { __navProbe?: boolean }).__navProbe === true,
	);

/**
 * 카테고리 목록은 layout의 서버 컴포넌트가 prefetch해 하이드레이션되므로
 * page.route로 가로챌 수 없다. 그래서 목 데이터가 아니라 테스트 계정에 실제로
 * 있는 카테고리 링크를 집는다. 실DB를 읽으므로 tab-scroll.test.ts에서 떼어냈다.
 */
test.describe("탭 이동과 스크롤 (실DB 카테고리)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();

		for (let index = 0; index < ENOUGH_MEMOS_TO_SCROLL; index++) {
			store.addMemo(createMockMemo());
		}

		await setupSupabaseMocks(page, store);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("카테고리 탭을 눌러도 문서를 다시 받지 않는다.", async ({ page }) => {
		const categoryLink = page.locator('a[href*="category="]').first();

		const hasCategory = await categoryLink
			.waitFor({ state: "visible", timeout: 10_000 })
			.then(() => true)
			.catch(() => false);
		test.skip(!hasCategory, "이 계정에 카테고리가 없어 검증할 수 없다");

		await markWindow(page);

		await categoryLink.click();
		await page.waitForURL(/category=/);

		expect(await isWindowMarkAlive(page)).toBe(true);
	});
});
