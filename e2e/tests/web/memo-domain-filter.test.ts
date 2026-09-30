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

test.describe("메모 도메인 필터 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		const workCategory = store.addCategory(
			createMockCategory({ name: "Work" }),
		);

		store.addMemo(
			createMockMemo({
				title: "유튜브 강의 정리",
				url: "https://www.youtube.com/watch?v=1",
				category_id: workCategory.id,
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "유튜브 라이브 후기",
				url: "https://youtube.com/watch?v=2",
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "모바일 유튜브 메모",
				url: "https://m.youtube.com/watch?v=3",
			}),
		);
		store.addMemo(
			createMockMemo({
				title: "벨로그 강의 글",
				url: "https://velog.io/@user/post",
			}),
		);

		await setupSupabaseMocks(page, store);
	});

	const gotoMemos = async (page: Page, query = "") =>
		gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}${query}`,
			regexp: new RegExp(PATHS.memos),
		});

	const openDomainList = async (page: Page) => {
		await page.getByRole("button", { name: "Domain", exact: true }).click();
	};

	test("도메인 컨트롤을 열면, www.를 합친 도메인이 이름순으로 중복 없이 나온다.", async ({
		page,
	}) => {
		await gotoMemos(page);
		await expect(page.locator(".memo-item")).toHaveCount(4);

		await openDomainList(page);

		await expect(page.getByRole("option")).toHaveText([
			"All domains",
			"m.youtube.com",
			"velog.io",
			"youtube.com",
		]);
	});

	test("도메인을 고르면, 주소에 domain이 붙고 그 도메인의 메모만 남는다.", async ({
		page,
	}) => {
		await gotoMemos(page);
		await openDomainList(page);
		await page
			.getByRole("option", { name: "youtube.com", exact: true })
			.click();

		await expect(page).toHaveURL(/domain=youtube\.com/);
		await expect(page.locator(".memo-item")).toHaveCount(2);
		await expect(page.getByText("2 memos from youtube.com")).toBeVisible();
		await expect(
			page.locator(".memo-item", { hasText: "유튜브 강의 정리" }),
		).toBeVisible();
		await expect(
			page.locator(".memo-item", { hasText: "유튜브 라이브 후기" }),
		).toBeVisible();
	});

	test("youtube.com을 고르면, m.youtube.com 메모는 다른 도메인이라 나오지 않는다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?domain=youtube.com");

		await expect(page.locator(".memo-item")).toHaveCount(2);
		await expect(
			page.locator(".memo-item", { hasText: "모바일 유튜브 메모" }),
		).toHaveCount(0);
	});

	test("m.youtube.com을 고르면, 그 도메인의 메모만 나온다.", async ({
		page,
	}) => {
		await gotoMemos(page);
		await openDomainList(page);
		await page
			.getByRole("option", { name: "m.youtube.com", exact: true })
			.click();

		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "모바일 유튜브 메모" }),
		).toBeVisible();
	});

	test("선택한 도메인의 X를 누르면, 주소에서 domain이 빠지고 전체 목록이 돌아온다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?domain=velog.io");
		await expect(page.locator(".memo-item")).toHaveCount(1);

		await page.getByRole("button", { name: "Clear domain filter" }).click();

		await expect(page).not.toHaveURL(/domain=/);
		await expect(page.locator(".memo-item")).toHaveCount(4);
		await expect(page.getByText("4 memos")).toBeVisible();
	});

	test("전체 도메인을 고르면, 필터가 해제된다.", async ({ page }) => {
		await gotoMemos(page, "?domain=velog.io");
		await expect(page.locator(".memo-item")).toHaveCount(1);

		await page.getByRole("button", { name: "velog.io" }).first().click();
		await page.getByRole("option", { name: "All domains" }).click();

		await expect(page).not.toHaveURL(/domain=/);
		await expect(page.locator(".memo-item")).toHaveCount(4);
	});

	test("도메인을 고른 채 검색어를 입력하면, 두 조건을 모두 만족하는 메모만 남는다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?domain=youtube.com");
		await expect(page.locator(".memo-item")).toHaveCount(2);

		await page.getByPlaceholder("Search memos").fill("강의");

		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "유튜브 강의 정리" }),
		).toBeVisible();
		await expect(page).toHaveURL(/domain=youtube\.com/);
	});

	test("도메인과 카테고리를 함께 걸면, 두 조건을 모두 만족하는 메모만 남는다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?category=Work&domain=youtube.com");

		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(
			page.locator(".memo-item", { hasText: "유튜브 강의 정리" }),
		).toBeVisible();
	});

	test("도메인을 고르면, 카테고리 등 다른 쿼리는 주소에 그대로 남는다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?category=Work");
		await openDomainList(page);
		await page
			.getByRole("option", { name: "youtube.com", exact: true })
			.click();

		await expect(page).toHaveURL(/category=Work/);
		await expect(page).toHaveURL(/domain=youtube\.com/);
	});

	test("주소로 바로 들어오면, 선택한 도메인이 복원된다.", async ({ page }) => {
		await gotoMemos(page, "?domain=WWW.YouTube.com");

		await expect(page.locator(".memo-item")).toHaveCount(2);
		await expect(
			page.getByRole("button", { name: "youtube.com" }).first(),
		).toBeVisible();
		await expect(page.getByText("2 memos from youtube.com")).toBeVisible();
	});

	test("잘못된 도메인 값이 오면, 필터 없이 전체 목록을 보여준다.", async ({
		page,
	}) => {
		await gotoMemos(page, "?domain=you%20tube!");

		await expect(page.locator(".memo-item")).toHaveCount(4);
		await expect(page.getByText("4 memos")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Domain", exact: true }),
		).toBeVisible();
	});

	test("도메인 목록을 불러오지 못하면, 컨트롤만 비활성화되고 메모 목록은 그대로 보인다.", async ({
		page,
	}) => {
		await page.context().route(/\/rest\/v1\/memo\?.*select=url(&|$)/, (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "boom" }),
			}),
		);

		await gotoMemos(page);

		await expect(page.locator(".memo-item")).toHaveCount(4);
		await expect(
			page.getByRole("button", { name: "Domain", exact: true }),
		).toBeDisabled();
		await expect(page.getByTitle("Couldn't load domains")).toBeVisible();
	});

	test("도메인 목록을 불러오는 동안, 컨트롤 자리에 Skeleton이 보이고 메모 목록은 먼저 보인다.", async ({
		page,
	}) => {
		let releaseDomains = () => {};
		const domainsGate = new Promise<void>((resolve) => {
			releaseDomains = resolve;
		});
		await page
			.context()
			.route(/\/rest\/v1\/memo\?.*select=url(&|$)/, async (route) => {
				await domainsGate;
				await route.fallback();
			});

		await gotoMemos(page);

		await expect(page.locator(".memo-item")).toHaveCount(4);
		await expect(page.locator(".animate-pulse.h-10.w-28")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Domain", exact: true }),
		).toHaveCount(0);

		releaseDomains();

		await expect(page.locator(".animate-pulse.h-10.w-28")).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "Domain", exact: true }),
		).toBeVisible();
	});

	test("영문 화면에서는, 도메인 컨트롤 문구가 영어로 나온다.", async ({
		page,
	}) => {
		await gotoMemos(page);
		await openDomainList(page);

		await expect(page.getByPlaceholder("Search domains")).toBeVisible();

		await page.getByPlaceholder("Search domains").fill("zzz");

		await expect(page.getByText("No results found")).toBeVisible();
	});

	for (const view of ["grid", "list"] as const) {
		test.describe(`${view} 보기의 도메인 결과 없음`, () => {
			const viewQuery = view === "list" ? "&view=list" : "";

			test("내 목록에 없는 도메인이면, 아이콘·제목·설명·버튼이 있는 도메인 빈 상태를 보여준다.", async ({
				page,
			}) => {
				await gotoMemos(page, `?domain=nothing.com${viewQuery}`);

				await expect(page.locator(".memo-item")).toHaveCount(0);
				await expect(page.locator("svg.lucide-search-x")).toBeVisible();
				await expect(page.getByText("No memos from this domain")).toBeVisible();
				await expect(
					page.getByText(
						"Memos from nothing.com don't show up with the current filters",
					),
				).toBeVisible();
				await expect(
					page.getByRole("button", {
						name: "Clear the domain filter",
						exact: true,
					}),
				).toBeVisible();
				await expect(page.getByText("Create your first memo")).toHaveCount(0);
				await expect(page.getByText("0 memos from nothing.com")).toBeVisible();
			});

			test("빈 상태의 해제 버튼을 누르면, 도메인이 풀리고 전체 목록이 돌아온다.", async ({
				page,
			}) => {
				await gotoMemos(page, `?domain=nothing.com${viewQuery}`);

				await page
					.getByRole("button", { name: "Clear the domain filter", exact: true })
					.click();

				await expect(page).not.toHaveURL(/domain=/);
				await expect(page.locator(".memo-item")).toHaveCount(4);
			});

			test("도메인과 검색어가 겹쳐 0건이면, 검색 빈 상태가 아니라 도메인 빈 상태를 보여준다.", async ({
				page,
			}) => {
				await gotoMemos(page, `?domain=youtube.com${viewQuery}`);
				await expect(page.locator(".memo-item")).toHaveCount(2);

				await page.getByPlaceholder("Search memos").fill("벨로그");

				await expect(page.locator(".memo-item")).toHaveCount(0);
				await expect(page.getByText("No memos from this domain")).toBeVisible();
				await expect(page.getByText("No results")).toHaveCount(0);
			});
		});
	}
});
