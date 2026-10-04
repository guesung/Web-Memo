import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const MEMOS_PER_CATEGORY = 30;

async function scrollIntoMemoList(page: Page) {
	await expect(page.locator("#memo-grid .memo-item").first()).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const scroller = document.scrollingElement;
				return (scroller?.scrollHeight ?? 0) - (scroller?.clientHeight ?? 0);
			}),
		)
		.toBeGreaterThan(700);
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(300);
}

async function installScrollToProbe(page: Page) {
	await page.evaluate(() => {
		const original = window.scrollTo.bind(window);
		document.body.dataset.scrollToCalls = "[]";
		Object.defineProperty(window, "scrollTo", {
			configurable: true,
			value: (x: number | ScrollToOptions, y?: number) => {
				const calls = JSON.parse(document.body.dataset.scrollToCalls ?? "[]");
				calls.push([x, y]);
				document.body.dataset.scrollToCalls = JSON.stringify(calls);
				if (typeof x === "number") original(x, y ?? 0);
				else original(x);
			},
		});
	});
}

async function getScrollObservation(page: Page) {
	return page.evaluate(() => {
		const scroller = document.scrollingElement;
		return {
			y: window.scrollY,
			maxY: (scroller?.scrollHeight ?? 0) - (scroller?.clientHeight ?? 0),
			calls: JSON.parse(document.body.dataset.scrollToCalls ?? "[]") as Array<
				[number | ScrollToOptions, number | null]
			>,
		};
	});
}

test.describe("메모 목록 전환의 스크롤 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		const work = store.addCategory(createMockCategory({ name: "Work" }));
		const life = store.addCategory(createMockCategory({ name: "Life" }));
		const longBody = Array.from(
			{ length: 5 },
			(_, line) => `카테고리 전환 전후에도 볼 수 있는 메모 ${line}`,
		).join("\n");
		for (let index = 1; index <= MEMOS_PER_CATEGORY; index++) {
			store.addMemo(
				createMockMemo({
					title: `Work memo ${index}`,
					memo: longBody,
					category_id: work.id,
				}),
			);
			store.addMemo(
				createMockMemo({
					title: `Life memo ${index}`,
					memo: longBody,
					category_id: life.id,
				}),
			);
		}
		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("카드 카테고리 이동 후 목록과 명시적 scrollTo 부재를 확인한다", async ({
		page,
	}) => {
		await scrollIntoMemoList(page);
		const lifeCard = page
			.locator(".memo-item", { hasText: "Life memo" })
			.nth(6);
		await lifeCard.scrollIntoViewIfNeeded();
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(300);
		const before = await getScrollObservation(page);
		await installScrollToProbe(page);
		await lifeCard.getByText("Life", { exact: true }).click();
		await expect(page).toHaveURL(/category=Life/);
		await expect(page.getByText("30 memos")).toBeVisible();
		await expect(page.locator("#memo-grid .memo-item").first()).toBeVisible();
		const after = await getScrollObservation(page);
		expect(after.calls).not.toContainEqual([0, 0]);
		expect(after.maxY).toBeGreaterThan(300);
		console.log("card category scroll", { before, after });
	});

	test("Grid와 List 전환은 각각 정상 렌더링하고 강제 scrollTo를 부르지 않는다", async ({
		page,
	}) => {
		await scrollIntoMemoList(page);
		await installScrollToProbe(page);
		await page.getByRole("button", { name: "By date" }).click();
		await expect(page).toHaveURL(/view=list/);
		await expect(page.getByTestId("memo-list-item").first()).toBeVisible();
		const list = await getScrollObservation(page);
		expect(list.calls).not.toContainEqual([0, 0]);
		await page.getByRole("button", { name: "Grid view" }).click();
		await expect(page).toHaveURL(/view=grid/);
		await expect(page.locator("#memo-grid .memo-item").first()).toBeVisible();
		const grid = await getScrollObservation(page);
		expect(grid.calls).not.toContainEqual([0, 0]);
		console.log("view toggle scroll", { list, grid });
	});
});
