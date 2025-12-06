import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import {
	EXAMPLE_URL,
	gotoSafely,
	LANGUAGE,
	login,
	openSidePanel,
} from "../lib";

const isCI = process.env.CI === "true";

async function clearGuideLocalStorage(page: import("@playwright/test").Page) {
	await page.evaluate(() => {
		localStorage.removeItem("guide");
	});
}

test.describe.configure({ mode: "parallel" });
test.describe("가이드 기능", () => {
	test("메모 페이지 최초 접속시, 가이드를 볼 수 있다.", async ({ page }) => {
		// Navigate to login page first and clear localStorage
		await page.goto(`/${LANGUAGE}${PATHS.login}`);
		await clearGuideLocalStorage(page);

		// Now login - this will redirect to memos page
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));

		// Wait for guide to initialize (depends on extension manifest loading)
		await page.locator("#driver-popover-description").waitFor({ state: "visible", timeout: 15000 });
		await expect(page.locator("#driver-popover-description")).toHaveText(
			`Ready to start? Press '${isCI ? "Alt" : "Option"} + S' to open the side panel`,
		);
	});

	test("다음 버튼을 클릭하면, 다음 가이드 페이지로 이동한다.", async ({
		page,
	}) => {
		// Navigate to login page first and clear localStorage
		await page.goto(`/${LANGUAGE}${PATHS.login}`);
		await clearGuideLocalStorage(page);

		// Login to get to memos page
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));

		// Wait for guide to initialize on step 1
		await page.locator("#driver-popover-description").waitFor({ state: "visible", timeout: 15000 });

		// Click next button to advance to step 2
		await page.locator(".driver-popover-next-btn").click();
		await page.waitForTimeout(300);

		// Verify we're on step 2
		await expect(page.locator("#driver-popover-description")).toHaveText(
			"Great! Now you can write memos. Don't worry, they save automatically",
		);
	});

	test("5단계에서 메모 새로고침 버튼을 누르면, 가이드가 종료된다.", async ({
		page,
	}) => {
		// Navigate to login page first and clear localStorage
		await page.goto(`/${LANGUAGE}${PATHS.login}`);
		await clearGuideLocalStorage(page);

		// Login to get to memos page
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));

		// Wait for guide to initialize
		await page.locator(".driver-popover-next-btn").waitFor({ state: "visible", timeout: 15000 });

		await page.locator(".driver-popover-next-btn").click();
		await page.waitForTimeout(300);
		await page.locator(".driver-popover-next-btn").click();
		await page.waitForTimeout(300);
		await page.locator(".driver-popover-next-btn").click();
		await page.waitForTimeout(300);
		await page.locator(".driver-popover-next-btn").click();
		await page.waitForTimeout(300);
		await page.locator("#refresh").click();

		await expect(page.locator("#driver-popover")).toBeHidden();
	});
});
