import { PATHS } from "@web-memo/shared/constants";
import { REGEXR } from "../lib/constants";
import { expect, test } from "./fixtures";

test.describe("로그인 페이지", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/en/memos");
	});
	test.describe("로그인 기능", () => {
		test("로그인을 하지 않고 메인 페이지에 접속할 경우, 로그인 페이지로 이동한다.", async ({
			page,
		}) => {
			expect(page).toHaveURL(new RegExp(PATHS.login));
		});
		test("카카오 로그인 버튼을 클릭하면, 카카오 로그인 페이지로 이동한다.", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Login with Kakao" }).click();

			await page.waitForURL(new RegExp(PATHS.kakaoLogin));

			expect(page).toHaveURL(new RegExp(PATHS.kakaoLogin));
		});
		test("구글 로그인 버튼을 클릭하면, 구글 로그인 페이지로 이동한다.", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Login with Google" }).click();

			await page.waitForURL(REGEXR.page.googleLogin);

			expect(page).toHaveURL(REGEXR.page.googleLogin);
		});
		test("테스트 계정으로 로그인 버튼을 클릭하면, 메인 페이지로 이동한다.", async ({
			page,
		}) => {
			await page.getByRole("button", { name: "Login with Test" }).click();

			await page.waitForURL(REGEXR.page.memos);

			expect(page).toHaveURL(REGEXR.page.memos);
		});
	});
});
