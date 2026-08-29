import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("메모 검색·필터 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		const workCategory = store.addCategory(
			createMockCategory({ name: "Work" }),
		);
		const lifeCategory = store.addCategory(
			createMockCategory({ name: "Life" }),
		);

		store.addMemo(
			createMockMemo({
				title: "타입스크립트 마이그레이션",
				memo: "tsconfig를 정리한다",
				category_id: workCategory.id,
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "주말 등산 코스",
				memo: "북한산에 다녀오기",
				category_id: lifeCategory.id,
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "회고 작성",
				memo: "타입스크립트 도입 회고를 남긴다",
				category_id: workCategory.id,
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "즐겨찾기한 메모",
				memo: "나중에 읽는다",
				isWish: true,
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
	});

	test("기본 목록에는 즐겨찾기하지 않은 메모만 나온다.", async ({ page }) => {
		await expect(page.locator(".memo-item")).toHaveCount(3);
		await expect(page.getByText("3 memos")).toBeVisible();
		await expect(
			page.locator(".memo-item", { hasText: "즐겨찾기한 메모" }),
		).toHaveCount(0);
	});

	test("검색어를 입력하면, 제목이나 본문에 그 말이 있는 메모만 남는다.", async ({
		page,
	}) => {
		await expect(page.locator(".memo-item")).toHaveCount(3);

		await page.getByPlaceholder("Search memos").fill("타입스크립트");

		await expect(page.locator(".memo-item")).toHaveCount(2);
		await expect(
			page.locator(".memo-item", { hasText: "타입스크립트 마이그레이션" }),
		).toBeVisible();
		await expect(
			page.locator(".memo-item", { hasText: "회고 작성" }),
		).toBeVisible();
	});

	test("검색어를 지우면, 모든 메모가 다시 보인다.", async ({ page }) => {
		const searchInput = page.getByPlaceholder("Search memos");

		await searchInput.fill("등산");
		await expect(page.locator(".memo-item")).toHaveCount(1);

		await searchInput.fill("");
		await expect(page.locator(".memo-item")).toHaveCount(3);
	});

	test("위시리스트로 이동하면, 즐겨찾기한 메모만 남는다.", async ({ page }) => {
		await page.getByRole("link", { name: "My wishlist" }).click();

		await expect(page).toHaveURL(/isWish=true/);
		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "즐겨찾기한 메모" }),
		).toBeVisible();
	});

	test("메모의 카테고리를 누르면, 그 카테고리의 메모만 남는다.", async ({
		page,
	}) => {
		await page
			.locator(".memo-item", { hasText: "주말 등산 코스" })
			.getByText("Life")
			.click();

		await expect(page).toHaveURL(/category=Life/);
		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "주말 등산 코스" }),
		).toBeVisible();
	});
});
