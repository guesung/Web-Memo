import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const ROUTES = [
	{ path: PATHS.memos, ko: "내 메모", en: "My memos" },
	{ path: PATHS.memosWish, ko: "위시리스트", en: "Wishlist" },
	{ path: PATHS.memosStar, ko: "중요 메모", en: "Important" },
	{ path: PATHS.memosReading, ko: "읽는 중", en: "Reading" },
	{ path: PATHS.highlights, ko: "하이라이트", en: "Highlights" },
] as const;
const BRAND = { ko: "웹 메모", en: "Web Memo" } as const;

test.describe("메모 페이지 브라우저 제목 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		const store = new MockSupabaseStore();
		store.addMemo(createMockMemo({ memo: "Title test memo" }));
		await setupSupabaseMocks(page, store);
	});

	for (const lng of ["ko", "en"] as const) {
		for (const route of ROUTES) {
			test(`${lng}${route.path} 직접 진입 시 번역된 제목을 표시한다`, async ({
				page,
			}) => {
				await page.goto(`/${lng}${route.path}`);
				await expect(page).toHaveURL(new RegExp(`/${lng}${route.path}$`));
				await expect(page).toHaveTitle(`${BRAND[lng]} | ${route[lng]}`);
				await expect(page.locator("head title")).toHaveCount(1);
			});
		}

		test(`${lng} 사이드바로 이동할 때 문서를 다시 받지 않고 제목을 갱신한다`, async ({
			page,
		}) => {
			await page.goto(`/${lng}${PATHS.memos}`);
			await expect(page).toHaveTitle(`${BRAND[lng]} | ${ROUTES[0][lng]}`);
			await page.evaluate(() => {
				(window as unknown as { __titleNavProbe?: boolean }).__titleNavProbe =
					true;
			});
			const sidebar = page.locator('[data-sidebar="sidebar"]');
			for (const route of [
				ROUTES[1],
				ROUTES[2],
				ROUTES[3],
				ROUTES[4],
				ROUTES[0],
			]) {
				await sidebar
					.getByRole("link", { name: route[lng], exact: true })
					.click();
				await expect(page).toHaveURL(new RegExp(`/${lng}${route.path}$`));
				await expect(page).toHaveTitle(`${BRAND[lng]} | ${route[lng]}`);
				expect(
					await page.evaluate(
						() =>
							(window as unknown as { __titleNavProbe?: boolean })
								.__titleNavProbe,
					),
				).toBe(true);
			}
		});

		test(`${lng} 보기 query를 바꿔도 메모 페이지 제목을 유지한다`, async ({
			page,
		}) => {
			await page.goto(`/${lng}${PATHS.memos}`);
			await expect(page).toHaveTitle(`${BRAND[lng]} | ${ROUTES[0][lng]}`);
			await page
				.getByRole("button", {
					name: lng === "ko" ? "날짜별 보기" : "By date",
				})
				.click();
			await expect(page).toHaveURL(/view=list/);
			await expect(page).toHaveTitle(`${BRAND[lng]} | ${ROUTES[0][lng]}`);
			await page
				.getByRole("button", {
					name: lng === "ko" ? "격자로 보기" : "Grid view",
				})
				.click();
			await expect(page).toHaveURL(/view=grid/);
			await expect(page).toHaveTitle(`${BRAND[lng]} | ${ROUTES[0][lng]}`);
		});
	}
});

test("변경 대상이 아닌 공개 페이지의 기존 제목은 유지한다", async ({
	page,
}) => {
	await page.goto(`/ko${PATHS.featuresMemo}`);
	await expect(page).toHaveTitle(
		"브라우저 메모 - 아티클 읽으며 바로 메모 | 웹 메모",
	);
});
