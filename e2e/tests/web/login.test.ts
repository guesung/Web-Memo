import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

// 비로그인 상태의 화면을 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ mode: "parallel" });
test.describe("로그인 기능", () => {
	test.beforeEach(async ({ page }) => {
		// 로그인 뒤 메모 화면이 목록·설정을 읽는다. 실서버로 가지 않도록 빈 목 저장소를 씌운다.
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("로그인을 하지 않고 메인 페이지에 접속할 경우, 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.login),
		});

		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});

	test("로그인 없이 쿼리가 붙은 보호 페이지에 접속하면, 원래 경로와 쿼리를 next에 담아 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		const originalPath = `/ko${PATHS.memos}?id=123&utm_source=weekly_report&utm_medium=email&utm_campaign=weekly_memo_resurface&utm_content=memo_1`;

		await page.goto(originalPath);
		await page.waitForURL(new RegExp(PATHS.login));

		const url = new URL(page.url());
		expect(url.pathname).toBe(`/ko${PATHS.login}`);
		expect(url.searchParams.get("next")).toBe(originalPath);
		expect(url.searchParams.has("id")).toBe(false);
	});

	test("next가 있는 로그인 뒤에는 원래 경로의 id와 UTM 쿼리가 그대로 남는다.", async ({
		page,
	}) => {
		const nextPath = `/ko${PATHS.memos}?id=123&utm_source=weekly_report&utm_content=memo_1`;

		await page.goto(`/ko${PATHS.login}?next=${encodeURIComponent(nextPath)}`);
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(/utm_source=weekly_report/);

		const url = new URL(page.url());
		expect(url.pathname).toBe(`/ko${PATHS.memos}`);
		expect(url.searchParams.get("id")).toBe("123");
		expect(url.searchParams.get("utm_content")).toBe("memo_1");
	});

	for (const unsafeNext of [
		"https://evil.com/steal",
		"//evil.com",
		"/\\evil.com",
	]) {
		test(`외부로 나가는 next(${unsafeNext})는 버려지고 기본 이동을 유지한다.`, async ({
			page,
		}) => {
			await page.goto(
				`/ko${PATHS.login}?next=${encodeURIComponent(unsafeNext)}`,
			);
			await expect(page.getByTestId("test-login-button")).toBeVisible();
			await expect(page.locator('input[name="next"]')).toHaveCount(0);

			await page.getByTestId("test-login-button").click();
			await page.waitForURL(new RegExp(PATHS.memos));

			expect(new URL(page.url()).hostname).not.toBe("evil.com");
		});
	}

	test("로그인 오류로 돌아오면 안내와 재시도 버튼을 표시한다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `/ko${PATHS.login}?error=1`,
			regexp: new RegExp(`${PATHS.login}\\?error=1`),
		});

		const alert = page.locator("main").getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert).toContainText(
			"로그인이 끝나지 않았어요. 다시 한 번 눌러주세요.",
		);
		for (const provider of ["kakao", "google", "apple"]) {
			await expect(page.getByTestId(`${provider}-login-button`)).toBeEnabled();
		}
	});

	test("카카오 로그인 버튼을 클릭하면, 카카오 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.login}`,
			regexp: new RegExp(PATHS.login),
		});
		await page.getByTestId("kakao-login-button").click();
		await page.waitForURL(new RegExp(PATHS.kakaoLogin));

		await expect(page).toHaveURL(new RegExp(PATHS.kakaoLogin));
	});
	test("구글 로그인 버튼을 클릭하면, 구글 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.login}`,
			regexp: new RegExp(PATHS.login),
		});
		// 라우트가 하나라도 걸려 있으면(패턴이 무관해도) 구글 계정 화면으로 가는 리다이렉트가
		// net::ERR_ABORTED로 끊긴다. 이 이동은 Supabase REST를 부르지 않으므로 목과 가드를 걷어낸다.
		await page.context().unrouteAll();
		await page.getByTestId("google-login-button").click();
		await page.waitForURL(new RegExp(PATHS.googleLogin));

		await expect(page).toHaveURL(new RegExp(PATHS.googleLogin));
	});
	test("테스트 계정으로 로그인 버튼을 클릭하면, 메인 페이지로 이동한다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.login}`,
			regexp: new RegExp(PATHS.login),
		});
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));

		await expect(page).toHaveURL(new RegExp(PATHS.memos));
	});
});
