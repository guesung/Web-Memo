import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockFavorite,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const FAVORITE_REST_PATTERN = "**/rest/v1/favorite**";

test.describe("즐겨찾기 페이지 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		await setupSupabaseMocks(page, store);
	});

	async function gotoFavorites(page: Parameters<typeof gotoSafely>[0]["page"]) {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.favorites}`,
			regexp: new RegExp(PATHS.favorites),
		});
	}

	test("사이드바에서 즐겨찾기 페이지로 이동한다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		await page
			.locator('[data-sidebar="sidebar"]')
			.getByRole("link", { name: "Favorites", exact: true })
			.click();

		await expect(page).toHaveURL(new RegExp(PATHS.favorites));
		await expect(
			page.getByText("No favorite pages yet", { exact: true }),
		).toBeVisible();
	});

	test("즐겨찾기가 없으면 빈 상태를 보여준다.", async ({ page }) => {
		await gotoFavorites(page);

		await expect(
			page.getByText("No favorite pages yet", { exact: true }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
	});

	test("즐겨찾기를 최신순으로 보여주고 원문을 새 탭으로 연다.", async ({
		page,
	}) => {
		store.addFavorite(
			createMockFavorite({
				title: "오래된 글",
				url: "https://www.old.example.com/a",
				created_at: "2026-01-01T00:00:00.000Z",
			}),
		);
		store.addFavorite(
			createMockFavorite({
				title: "최신 글",
				url: "https://www.new.example.com/b",
				created_at: "2026-03-01T00:00:00.000Z",
			}),
		);
		await gotoFavorites(page);

		const links = page.locator("main a[target='_blank']");
		await expect(links).toHaveCount(2);
		await expect(links.first()).toContainText("최신 글");
		await expect(links.first()).toContainText("new.example.com");
		await expect(links.first()).not.toContainText("www.");
		await expect(links.first()).toHaveAttribute(
			"href",
			"https://www.new.example.com/b",
		);
		await expect(links.last()).toContainText("오래된 글");
	});

	test("제목을 수정하면 목록과 저장소에 반영된다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "수정 전 제목" }));
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit title" }).click();
		const input = page.getByRole("textbox", { name: "Edit title" });
		await expect(input).toBeFocused();
		await input.fill("  수정한 제목  ");
		await input.press("Enter");

		await expect(page.getByText("수정한 제목", { exact: true })).toBeVisible();
		expect(store.getAllFavorites()[0]?.title).toBe("수정한 제목");
	});

	test("공백뿐이거나 바뀐 게 없으면 요청 없이 보기 모드로 돌아간다.", async ({
		page,
	}) => {
		store.addFavorite(createMockFavorite({ title: "그대로인 제목" }));
		let patchCount = 0;
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() === "PATCH") patchCount += 1;
			await route.fallback();
		});
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit title" }).click();
		const blankInput = page.getByRole("textbox", { name: "Edit title" });
		await blankInput.fill("   ");
		await blankInput.press("Enter");
		await expect(
			page.getByText("그대로인 제목", { exact: true }),
		).toBeVisible();

		await page.getByRole("button", { name: "Edit title" }).click();
		await page.getByRole("textbox", { name: "Edit title" }).press("Enter");
		await expect(
			page.getByText("그대로인 제목", { exact: true }),
		).toBeVisible();

		expect(patchCount).toBe(0);
	});

	test("Esc로 제목 수정을 취소한다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "취소할 제목" }));
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit title" }).click();
		const input = page.getByRole("textbox", { name: "Edit title" });
		await input.fill("저장되면 안 되는 제목");
		await input.press("Escape");

		await expect(page.getByText("취소할 제목", { exact: true })).toBeVisible();
		expect(store.getAllFavorites()[0]?.title).toBe("취소할 제목");
	});

	test("제목 수정이 실패하면 원래 제목으로 되돌리고 알린다.", async ({
		page,
	}) => {
		store.addFavorite(createMockFavorite({ title: "원래 제목" }));
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() !== "PATCH") {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({ code: "PGRST_TEST", message: "Mock failure" }),
			});
		});
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit title" }).click();
		const input = page.getByRole("textbox", { name: "Edit title" });
		await input.fill("바뀌면 안 되는 제목");
		await input.press("Enter");

		await expect(
			page.getByText(
				"Couldn't change the title. Please try again in a moment.",
			),
		).toBeVisible();
		await expect(page.getByText("원래 제목", { exact: true })).toBeVisible();
		await expect(page.getByText("바뀌면 안 되는 제목")).toHaveCount(0);
	});

	test("확인 다이얼로그에서 삭제하면 목록에서 사라진다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "지울 글" }));
		store.addFavorite(createMockFavorite({ title: "남길 글" }));
		await gotoFavorites(page);

		await page
			.getByRole("listitem")
			.filter({ hasText: "지울 글" })
			.getByRole("button", { name: "Delete" })
			.click();
		await expect(page.getByRole("alertdialog")).toContainText("지울 글");
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Delete" })
			.click();

		await expect(page.getByText("Favorite deleted")).toBeVisible();
		await expect(page.getByText("지울 글", { exact: true })).toHaveCount(0);
		await expect(page.getByText("남길 글", { exact: true })).toBeVisible();
		expect(store.getAllFavorites().map((favorite) => favorite.title)).toEqual([
			"남길 글",
		]);
	});

	test("삭제를 취소하면 아무것도 바뀌지 않는다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "취소해도 남는 글" }));
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Delete" }).click();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Cancel" })
			.click();

		await expect(page.getByRole("alertdialog")).toHaveCount(0);
		await expect(
			page.getByText("취소해도 남는 글", { exact: true }),
		).toBeVisible();
		expect(store.getAllFavorites()).toHaveLength(1);
	});

	test("삭제가 실패하면 행이 돌아오고 알린다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "삭제 실패할 글" }));
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() !== "DELETE") {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({ code: "PGRST_TEST", message: "Mock failure" }),
			});
		});
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Delete" }).click();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Delete" })
			.click();

		await expect(
			page.getByText("Couldn't delete it. Please try again in a moment."),
		).toBeVisible();
		await expect(
			page.getByText("삭제 실패할 글", { exact: true }),
		).toBeVisible();
	});

	test("조회가 실패하면 오류 박스를 보여주고 다시 시도하면 목록이 나온다.", async ({
		page,
	}) => {
		store.addFavorite(createMockFavorite({ title: "재시도 후 보이는 글" }));
		let shouldFail = true;
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() !== "GET" || !shouldFail) {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ code: "PGRST_TEST", message: "Mock failure" }),
			});
		});
		await gotoFavorites(page);

		await expect(page.getByRole("alert")).toContainText(
			"Couldn't load your favorites",
		);
		shouldFail = false;
		await page.getByRole("button", { name: "Try again" }).click();

		await expect(
			page.getByText("재시도 후 보이는 글", { exact: true }),
		).toBeVisible();
	});
});
