import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { LANGUAGE } from "../lib";

test.describe.configure({ mode: "parallel" });
test.describe("로그인 기능", () => {
	test("로그인을 하지 않고 메인 페이지에 접속할 경우, 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await page.goto(`${LANGUAGE}${PATHS.memos}`);
		await page.waitForURL(new RegExp(PATHS.login));

		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});

	test("카카오 로그인 버튼을 클릭하면, 카카오 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await page.goto(`${LANGUAGE}${PATHS.login}`);
		await page.getByTestId("kakao-login-button").click();
		await page.waitForURL(new RegExp(PATHS.kakaoLogin));

		await expect(page).toHaveURL(new RegExp(PATHS.kakaoLogin));
	});
	test("구글 로그인 버튼을 클릭하면, 구글 로그인 페이지로 이동한다.", async ({
		page,
	}) => {
		await page.goto(`${LANGUAGE}${PATHS.login}`);
		await page.getByTestId("google-login-button").click();
		await page.waitForURL(new RegExp(PATHS.googleLogin));

		await expect(page).toHaveURL(new RegExp(PATHS.googleLogin));
	});
	test("테스트 계정으로 로그인 버튼을 클릭하면, 메인 페이지로 이동한다.", async ({
		page,
	}) => {
		await page.goto(`${LANGUAGE}${PATHS.login}`);
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));

		await expect(page).toHaveURL(new RegExp(PATHS.memos));
	});
});
