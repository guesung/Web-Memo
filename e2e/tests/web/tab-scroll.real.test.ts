import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import {
	cleanupTestData,
	createCleanupClient,
	createTestNamespace,
	getRunId,
	gotoSafely,
	LANGUAGE,
} from "../lib";
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
 * 테스트 계정에 카테고리를 실제로 만든다.
 * @throws 생성에 실패하면 던진다. 카테고리가 없으면 검증할 대상이 없다.
 */
const createRealCategory = async (name: string) => {
	const client = await createCleanupClient();
	const { error } = await client.from("category").insert({ name });

	if (error) {
		throw new Error(`카테고리 생성 실패: ${error.message}`);
	}
};

/**
 * 카테고리 목록은 layout의 서버 컴포넌트가 prefetch해 하이드레이션되므로
 * page.route로 가로챌 수 없다. 그래서 이 테스트 전용 카테고리를 실DB에 만들고
 * 그 링크만 집는다. 다른 실행의 카테고리가 보여도 무시한다. 실DB를 쓰므로 tab-scroll.test.ts에서 떼어냈다.
 */
test.describe("탭 이동과 스크롤 (실DB 카테고리)", () => {
	// 이름에 실행·테스트 ID를 새겨, 정리가 다른 실행의 카테고리를 건드리지 않게 한다.
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		categoryName = createTestNamespace({
			runId: getRunId(),
			testId: test.info().testId,
		}).categoryName("tab-scroll");
		// 레이아웃이 카테고리를 서버에서 읽으므로 페이지를 열기 전에 만든다.
		await createRealCategory(categoryName);

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

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls: [], categoryNames: [categoryName] });
	});

	test("카테고리 탭을 눌러도 문서를 다시 받지 않는다.", async ({ page }) => {
		const categoryLink = page.locator('a[href*="category="]', {
			hasText: categoryName,
		});
		await expect(categoryLink).toBeVisible();

		await markWindow(page);

		await categoryLink.click();
		await page.waitForURL(/category=/);

		expect(await isWindowMarkAlive(page)).toBe(true);
	});
});
