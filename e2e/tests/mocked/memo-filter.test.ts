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
				title: "위시리스트에 담은 메모",
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

	test("기본 목록에는 위시리스트에 담지 않은 메모만 나온다.", async ({
		page,
	}) => {
		await expect(page.locator(".memo-item")).toHaveCount(3);
		await expect(page.getByText("3 memos")).toBeVisible();
		await expect(
			page.locator(".memo-item", { hasText: "위시리스트에 담은 메모" }),
		).toHaveCount(0);
	});

	test("메모를 누르면, 다른 메모가 아니라 누른 메모의 상세가 열린다.", async ({
		page,
	}) => {
		await page.locator(".memo-item", { hasText: "주말 등산 코스" }).click();

		await expect(page.getByTestId("memo-textarea")).toHaveValue(
			"북한산에 다녀오기",
		);
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

	test("검색 결과가 없으면, 첫 메모 안내 대신 검색 결과 없음을 보여준다.", async ({
		page,
	}) => {
		await page.getByPlaceholder("Search memos").fill("어느메모에도없는말");

		await expect(page.locator(".memo-item")).toHaveCount(0);
		await expect(page.getByText("No results")).toBeVisible();
		await expect(page.getByText("Create your first memo")).toHaveCount(0);
	});

	test("위시리스트로 이동하면, 위시리스트에 담은 메모만 남는다.", async ({
		page,
	}) => {
		await page.getByRole("link", { name: "My wishlist" }).click();

		await expect(page).toHaveURL(/isWish=true/);
		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "위시리스트에 담은 메모" }),
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
