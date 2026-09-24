import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

test.describe("헤더 진입점 (로그인)", () => {
	test.beforeEach(async ({ page }) => {
		// 도착한 메모 화면이 목록·설정을 읽는다. 실서버로 가지 않도록 빈 목 저장소를 씌운다.
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("소개 화면에서 '내 메모'를 누르면 메모 화면으로 간다.", async ({
		page,
	}) => {
		await page.goto(`/ko${PATHS.introduce}`);

		await expect(getBrandLink(page)).toHaveAttribute(
			"href",
			`/ko${PATHS.introduce}`,
		);

		const memosLink = getHeader(page).getByRole("link", { name: "내 메모" });
		await expect(memosLink).toHaveAttribute("href", `/ko${PATHS.memos}`);
		await memosLink.click();
		await page.waitForURL(`**/ko${PATHS.memos}`);

		expect(new URL(page.url()).pathname).toBe(`/ko${PATHS.memos}`);
	});
});

test.describe("헤더 진입점 (로그아웃)", () => {
	// 비로그인 상태의 헤더를 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("소개 화면에서 '로그인하기'를 누르면 로그인 화면으로 간다.", async ({
		page,
	}) => {
		await page.goto(`/ko${PATHS.introduce}`);

		await expect(getBrandLink(page)).toHaveAttribute(
			"href",
			`/ko${PATHS.introduce}`,
		);

		const loginLink = getHeader(page).getByRole("link", {
			name: "로그인하기",
		});
		await expect(loginLink).toHaveAttribute("href", `/ko${PATHS.login}`);
		await loginLink.click();
		await page.waitForURL(`**/ko${PATHS.login}`);

		expect(new URL(page.url()).pathname).toBe(`/ko${PATHS.login}`);
	});

	test("로그인 화면에서는 '로그인하기' 진입점을 그리지 않는다.", async ({
		page,
	}) => {
		await page.goto(`/ko${PATHS.login}`);

		// 진입점이 비동기로 그려지므로, 같은 묶음의 테마 토글이 보인 뒤에 부재를 확인한다.
		await expect(
			getHeader(page).getByRole("button", { name: "Toggle theme" }),
		).toBeVisible();
		await expect(
			getHeader(page).getByRole("link", { name: "로그인하기" }),
		).toHaveCount(0);
	});
});

/** 전역 헤더 영역을 반환합니다. */
const getHeader = (page: Page) => page.locator("header");

/** 헤더의 로고를 포함한 브랜드 링크를 반환합니다. */
const getBrandLink = (page: Page) =>
	page.locator('header a:has(img[alt="logo"])');
