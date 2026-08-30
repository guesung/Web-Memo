import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
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

test.describe("탭 이동과 스크롤 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		for (let index = 0; index < ENOUGH_MEMOS_TO_SCROLL; index++) {
			store.addMemo(createMockMemo());
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

	test("하이라이트 페이지에도 사이드바가 보인다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await expect(page.getByRole("link", { name: "My memos" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Highlights" })).toBeVisible();
	});

	/**
	 * 카테고리 목록은 layout의 서버 컴포넌트가 prefetch해 하이드레이션되므로
	 * page.route로 가로챌 수 없다. 그래서 목 데이터가 아니라 실제로 렌더된
	 * 카테고리 링크를 집는다.
	 */
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

	test("사이드바 탭을 눌러도 문서를 다시 받지 않는다.", async ({ page }) => {
		await markWindow(page);

		await page.getByRole("link", { name: "Highlights" }).click();
		await page.waitForURL(new RegExp(PATHS.highlights));
		expect(await isWindowMarkAlive(page)).toBe(true);

		await page.getByRole("link", { name: "My memos" }).click();
		await page.waitForURL(new RegExp(`${PATHS.memos}$`));
		expect(await isWindowMarkAlive(page)).toBe(true);
	});

	test("메모 목록의 스크롤 주체는 문서 하나다.", async ({ page }) => {
		await expect(page.locator("#memo-grid")).toBeVisible();

		// 그리드와 그 조상 중 어디에도 자체 스크롤 영역이 없어야 한다.
		// scrollHeight > clientHeight는 근거가 못 된다 - overflow가 visible이어도
		// 내용이 넘치면 그렇게 되므로, 실제로 스크롤되는지는 overflow로 판정한다.
		const selfScrollingAncestors = await page
			.locator("#memo-grid")
			.evaluate((element) => {
				const found: string[] = [];
				let node: Element | null = element;

				while (node && node !== document.body) {
					const { overflowY } = getComputedStyle(node);
					const scrolls =
						(overflowY === "auto" || overflowY === "scroll") &&
						node.scrollHeight > node.clientHeight + 1;
					if (scrolls) {
						found.push(node.id || node.className || node.tagName);
					}
					node = node.parentElement;
				}

				return found;
			});
		expect(selfScrollingAncestors).toEqual([]);

		// 대신 문서가 스크롤된다.
		const documentScrolls = await page.evaluate(() => {
			const scroller = document.scrollingElement;
			return !!scroller && scroller.scrollHeight > scroller.clientHeight + 1;
		});
		expect(documentScrolls).toBe(true);
	});

	test("스크롤을 내린 뒤 다른 탭으로 가면 맨 위에서 시작한다.", async ({
		page,
	}) => {
		await page.evaluate(() => window.scrollTo(0, 600));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(0);

		await page.getByRole("link", { name: "My wishlist" }).click();
		await page.waitForURL(/isWish=true/);

		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	});

	test("하이라이트로 갔다 메모로 돌아와도 스크롤이 맨 위다.", async ({
		page,
	}) => {
		await page.evaluate(() => window.scrollTo(0, 600));

		await page.getByRole("link", { name: "Highlights" }).click();
		await page.waitForURL(new RegExp(PATHS.highlights));

		await page.getByRole("link", { name: "My memos" }).click();
		await page.waitForURL(new RegExp(`${PATHS.memos}$`));

		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	});
});
