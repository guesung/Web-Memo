import { expect, test } from "./fixtures";

const isCI = process.env.CI === "true";

test.describe("가이드 기능", () => {
	test("메모 페이지 최초 접속시, 가이드를 볼 수 있다.", async ({
		loginedPage,
	}) => {
		await expect(loginedPage.locator("#driver-popover-description")).toHaveText(
			`Ready to start? Press '${isCI ? "Alt" : "Option"} + S' to open the side panel`,
		);
	});
	test("사이드 패널을 열 시, 다음 가이드 페이지로 이동한다.", async ({
		loginedPage,
	}) => {
		await loginedPage.goto("https://blog.toss.im/article/toss-team-culture");
		await loginedPage.locator("#OPEN_SIDE_PANEL_BUTTON").click();
		await loginedPage.goto("/en/memos");

		await loginedPage.waitForTimeout(1000);

		expect(loginedPage.locator("#driver-popover-description")).toHaveText(
			"Great! Now you can write memos. Don't worry, they save automatically",
		);
	});
	test("새로고침 버튼을 누르면, 가이드가 종료된다.", async ({
		loginedPage,
	}) => {
		await loginedPage.locator(".driver-popover-next-btn").click();
		await loginedPage.waitForTimeout(1000);
		await loginedPage.locator(".driver-popover-next-btn").click();
		await loginedPage.waitForTimeout(1000);
		await loginedPage.locator("#refresh").click();

		expect(loginedPage.locator("#driver-popover")).toBeHidden();
	});
});
