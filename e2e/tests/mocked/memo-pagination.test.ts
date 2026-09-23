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
			const memoCount = await page.locator(".memo-item").count();
			if (memoCount > PAGE_SIZE) {
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

test.describe("날짜별 메모 목록 페이지 연결 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		const sharedCreatedAt = new Date(2026, 0, 11, 23, 30).toISOString();

		for (let order = 1; order <= 21; order++) {
			store.addMemo(
				createMockMemo({
					title: `같은 시각 메모 ${String(order).padStart(2, "0")}`,
					created_at: sharedCreatedAt,
				}),
			);
		}

		store.addMemo(
			createMockMemo({
				title: "같은 현지 날짜의 이른 메모",
				created_at: new Date(2026, 0, 11, 0, 30).toISOString(),
			}),
		);

		for (let order = 1; order <= 4; order++) {
			store.addMemo(
				createMockMemo({
					title: `전날 메모 ${order}`,
					created_at: new Date(2026, 0, 10, 12, order).toISOString(),
				}),
			);
		}

		await setupSupabaseMocks(page, store);
		await login(page);
		await skipGuide(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}?view=list`,
			regexp: /\/memos\?view=list/,
		});
	});

	test("목록에서 다음 장을 이어 읽어 같은 현지 날짜를 하나로 묶고 동률 커서의 메모도 보인다.", async ({
		page,
	}) => {
		const memoRows = page.getByTestId("memo-list-item");
		const dateGroups = page.getByTestId("memo-date-group");

		await expect(page.getByText("26 memos")).toBeVisible();
		await expect(memoRows).toHaveCount(PAGE_SIZE);
		await expect(dateGroups).toHaveCount(1);

		await page
			.getByRole("button", { name: "Load more" })
			.scrollIntoViewIfNeeded();

		await expect(memoRows).toHaveCount(26);
		await expect(dateGroups).toHaveCount(2);
		await expect(dateGroups.first().getByTestId("memo-list-item")).toHaveCount(
			22,
		);
		await expect(dateGroups.last().getByTestId("memo-list-item")).toHaveCount(
			4,
		);
		await expect(dateGroups.first().locator("h2 time")).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: /같은 시각 메모 01/ }),
		).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: /같은 시각 메모 21/ }),
		).toHaveCount(1);
	});

	test("목록 행을 누르면 해당 메모 id가 URL에 남고 상세 화면이 열린다.", async ({
		page,
	}) => {
		await page.getByRole("button", { name: /같은 시각 메모 21/ }).click();

		await expect(page).toHaveURL(/\?view=list&id=21/);
		await expect(page.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 21",
		);
	});

	test("목록에서 검색해도 기존 검색 조건으로 메모를 걸러낸다.", async ({
		page,
	}) => {
		await page.getByPlaceholder("Search memos").fill("전날 메모 1");

		await expect(page.getByTestId("memo-list-item")).toHaveCount(1);
		await expect(page.getByText("1 memos")).toBeVisible();
		await expect(
			page.getByRole("button", { name: /전날 메모 1/ }),
		).toBeVisible();
	});
});
