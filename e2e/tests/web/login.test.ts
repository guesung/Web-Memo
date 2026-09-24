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
