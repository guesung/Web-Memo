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
		// 목록이 서버에서 먼저 그려져 하이드레이션 전에 누른 클릭은 사라진다.
		await page.waitForLoadState("networkidle");
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

	function formDialog(page: Parameters<typeof gotoSafely>[0]["page"]) {
		return page.getByRole("dialog");
	}

	test("수정 다이얼로그는 현재 URL·제목이 채워져 열리고 제목에 포커스가 간다.", async ({
		page,
	}) => {
		store.addFavorite(
			createMockFavorite({ title: "수정 전 제목", url: "https://a.example/x" }),
		);
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit", exact: true }).click();

		const dialog = formDialog(page);
		await expect(
			dialog.getByRole("heading", { name: "Edit favorite" }),
		).toBeVisible();
		await expect(dialog.getByLabel("URL")).toHaveValue("https://a.example/x");
		await expect(dialog.getByLabel("Title")).toHaveValue("수정 전 제목");
		await expect(dialog.getByLabel("Title")).toBeFocused();
	});

	test("제목을 수정해 저장하면 목록과 저장소에 반영된다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "수정 전 제목" }));
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await formDialog(page).getByLabel("Title").fill("  수정한 제목  ");
		await formDialog(page).getByRole("button", { name: "Save" }).click();

		await expect(formDialog(page)).toHaveCount(0);
		await expect(
			page.getByText("Favorite updated", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("수정한 제목", { exact: true })).toBeVisible();
		expect(store.getAllFavorites()[0]?.title).toBe("수정한 제목");
	});

	test("URL을 수정해 저장하면 도메인 표시와 저장소가 갱신된다.", async ({
		page,
	}) => {
		store.addFavorite(
			createMockFavorite({
				title: "옮길 글",
				url: "https://old.example.com/a",
			}),
		);
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await formDialog(page).getByLabel("URL").fill("new.example.org/b");
		await formDialog(page).getByRole("button", { name: "Save" }).click();

		const link = page.locator("main a[target='_blank']");
		await expect(link).toContainText("new.example.org");
		await expect(link).toHaveAttribute("href", "https://new.example.org/b");
		const [saved] = store.getAllFavorites();
		expect(saved?.url).toBe("https://new.example.org/b");
		expect(saved?.page_key).toBe("https://new.example.org/b");
	});

	test("바뀐 게 없으면 요청 없이 다이얼로그를 닫는다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "그대로인 제목" }));
		let patchCount = 0;
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() === "PATCH") patchCount += 1;
			await route.fallback();
		});
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await formDialog(page).getByRole("button", { name: "Save" }).click();

		await expect(formDialog(page)).toHaveCount(0);
		await expect(
			page.getByText("그대로인 제목", { exact: true }),
		).toBeVisible();
		expect(patchCount).toBe(0);
	});

	test("수정을 취소하면 아무것도 바뀌지 않는다.", async ({ page }) => {
		store.addFavorite(createMockFavorite({ title: "취소할 제목" }));
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await formDialog(page).getByLabel("Title").fill("저장되면 안 되는 제목");
		await formDialog(page).getByRole("button", { name: "Cancel" }).click();

		await expect(formDialog(page)).toHaveCount(0);
		await expect(page.getByText("취소할 제목", { exact: true })).toBeVisible();
		expect(store.getAllFavorites()[0]?.title).toBe("취소할 제목");
	});

	test("저장이 실패하면 다이얼로그를 유지하고 알린다.", async ({ page }) => {
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

		await page.getByRole("button", { name: "Edit", exact: true }).click();
		await formDialog(page).getByLabel("Title").fill("바뀌면 안 되는 제목");
		await formDialog(page).getByRole("button", { name: "Save" }).click();

		await expect(
			page.getByText(
				"Couldn't save the favorite. Please try again in a moment.",
				{ exact: true },
			),
		).toBeVisible();
		await expect(formDialog(page)).toBeVisible();
		await expect(page.getByText("Mock failure")).toHaveCount(0);
		expect(store.getAllFavorites()[0]?.title).toBe("원래 제목");
	});

	test("헤더의 추가 버튼으로 추가하면 목록 맨 위에 들어간다.", async ({
		page,
	}) => {
		store.addFavorite(
			createMockFavorite({ title: "기존 글", url: "https://old.example/a" }),
		);
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Add", exact: true }).click();
		const dialog = formDialog(page);
		await expect(
			dialog.getByRole("heading", { name: "Add favorite" }),
		).toBeVisible();
		await expect(dialog.getByLabel("URL")).toBeFocused();
		await dialog.getByLabel("URL").fill("https://new.example/b");
		await dialog.getByLabel("Title").fill("새 글");
		await dialog.getByRole("button", { name: "Add", exact: true }).click();

		await expect(formDialog(page)).toHaveCount(0);
		await expect(
			page.getByText("Favorite added", { exact: true }),
		).toBeVisible();
		await expect(page.locator("main a[target='_blank']").first()).toContainText(
			"새 글",
		);
		expect(store.getAllFavorites()).toHaveLength(2);
	});

	test("scheme 없이 입력하면 https로 저장한다.", async ({ page }) => {
		await gotoFavorites(page);

		await page
			.getByRole("button", { name: "Add", exact: true })
			.first()
			.click();
		await formDialog(page).getByLabel("URL").fill("  example.com/article  ");
		await formDialog(page)
			.getByRole("button", { name: "Add", exact: true })
			.click();

		await expect(formDialog(page)).toHaveCount(0);
		expect(store.getAllFavorites()[0]?.url).toBe("https://example.com/article");
	});

	test("제목을 비우면 www를 뗀 도메인으로 저장한다.", async ({ page }) => {
		await gotoFavorites(page);

		await page
			.getByRole("button", { name: "Add", exact: true })
			.first()
			.click();
		await formDialog(page).getByLabel("URL").fill("https://www.example.com/a");
		await formDialog(page)
			.getByRole("button", { name: "Add", exact: true })
			.click();

		await expect(formDialog(page)).toHaveCount(0);
		expect(store.getAllFavorites()[0]?.title).toBe("example.com");
		await expect(page.locator("main a[target='_blank']").first()).toContainText(
			"example.com",
		);
	});

	test("올바르지 않은 URL이면 오류를 보여주고 요청하지 않는다.", async ({
		page,
	}) => {
		let postCount = 0;
		await page.route(FAVORITE_REST_PATTERN, async (route) => {
			if (route.request().method() === "POST") postCount += 1;
			await route.fallback();
		});
		await gotoFavorites(page);

		await page
			.getByRole("button", { name: "Add", exact: true })
			.first()
			.click();
		const dialog = formDialog(page);
		await dialog.getByLabel("URL").fill("ftp://example.com");
		await dialog.getByRole("button", { name: "Add", exact: true }).click();

		await expect(dialog.getByText("Enter a valid URL")).toBeVisible();
		await expect(dialog.getByLabel("URL")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(postCount).toBe(0);
	});

	test("이미 있는 페이지를 추가하면 다이얼로그를 유지하고 중복을 알린다.", async ({
		page,
	}) => {
		store.addFavorite(
			createMockFavorite({
				title: "이미 있는 글",
				url: "https://dup.example/a",
			}),
		);
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Add", exact: true }).click();
		const dialog = formDialog(page);
		await dialog.getByLabel("URL").fill("dup.example/a");
		await dialog.getByRole("button", { name: "Add", exact: true }).click();

		await expect(
			dialog.getByText("This page is already in your favorites"),
		).toBeVisible();
		await expect(dialog).toBeVisible();
		expect(store.getAllFavorites()).toHaveLength(1);
	});

	test("빈 상태의 추가 버튼으로도 같은 다이얼로그가 열린다.", async ({
		page,
	}) => {
		await gotoFavorites(page);

		await page.getByRole("button", { name: "Add favorite" }).click();

		await expect(
			formDialog(page).getByRole("heading", { name: "Add favorite" }),
		).toBeVisible();
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

		await expect(
			page.getByText("Favorite deleted", { exact: true }),
		).toBeVisible();
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
			page.getByText("Couldn't delete it. Please try again in a moment.", {
				exact: true,
			}),
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

		await expect(page.locator("main").getByRole("alert")).toContainText(
			"Couldn't load your favorites",
		);
		shouldFail = false;
		await page.getByRole("button", { name: "Try again" }).click();

		await expect(
			page.getByText("재시도 후 보이는 글", { exact: true }),
		).toBeVisible();
	});
});

test.describe("즐겨찾기 페이지 접근 제어 (Mocked)", () => {
	// web 프로젝트는 로그인 세션(storageState)을 물려받으므로, 비로그인 동작은 세션을 비워서 본다.
	test.use({ storageState: { cookies: [], origins: [] } });

	test("비로그인 상태로 접근하면 로그인 페이지로 보낸다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.favorites}`,
			regexp: new RegExp(PATHS.login),
		});

		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});
});
