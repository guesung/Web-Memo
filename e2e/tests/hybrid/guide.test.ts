import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { LANGUAGE } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

// 가이드 문구의 단축키는 웹이 브라우저 OS(isMac)로 고른다. 테스트 브라우저는 이 프로세스와 같은 OS에서 돈다.
const isMacOS = process.platform === "darwin";

async function clearGuideLocalStorage(page: import("@playwright/test").Page) {
	await page.evaluate(() => {
		localStorage.removeItem("guide");
	});
}

test.describe.configure({ mode: "parallel" });
test.describe("가이드 기능", () => {
	test.beforeEach(async ({ page }) => {
		// 가이드는 메모가 없어도 뜬다. 로그인 뒤 메모 화면이 실서버를 읽지 않도록 빈 목 저장소를 씌운다.
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("메모 페이지 최초 접속시, 가이드를 볼 수 있다.", async ({ page }) => {
		// Navigate to login page first and clear localStorage
		await page.goto(`/${LANGUAGE}${PATHS.login}`);
		await clearGuideLocalStorage(page);

		// Now login - this will redirect to memos page
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(`/${LANGUAGE}${PATHS.memos}`));

		// Wait for guide to initialize (depends on extension manifest loading)
		await page
			.locator("#driver-popover-description")
			.waitFor({ state: "visible", timeout: 15000 });
		await expect(page.locator("#driver-popover-description")).toHaveText(
			`Ready to start? Press '${isMacOS ? "Option" : "Alt"} + S' to open the side panel.`,
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
		await page.waitForURL(new RegExp(`/${LANGUAGE}${PATHS.memos}`));

		// Wait for guide to initialize on step 1
		await page
			.locator("#driver-popover-description")
			.waitFor({ state: "visible", timeout: 15000 });

		// Click next button to advance to step 2
		await page.locator(".driver-popover-next-btn").click();

		// Verify we're on step 2 (toHaveText가 단계 전환을 기다린다)
		await expect(page.locator("#driver-popover-description")).toHaveText(
			"Great! Now you can write memos. Don't worry, they save automatically.",
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
		await page.waitForURL(new RegExp(`/${LANGUAGE}${PATHS.memos}`));

		// Wait for guide to initialize
		await page
			.locator(".driver-popover-next-btn")
			.waitFor({ state: "visible", timeout: 15000 });

		// 고정 대기로 단계를 넘기면 하이라이트가 아직 이동 중이라 오버레이가 클릭을
		// 가로챈다. driver.js가 대상에 붙이는 driver-active-element를 기다린다.
		const nextButton = page.locator(".driver-popover-next-btn");

		await nextButton.click();
		await expect(page.locator("#driver-popover-description")).toHaveText(
			"Great! Now you can write memos. Don't worry, they save automatically.",
		);

		await nextButton.click();
		await expect(page.locator("#category")).toHaveClass(
			/driver-active-element/,
		);

		await nextButton.click();
		await expect(page.locator("#settings")).toHaveClass(
			/driver-active-element/,
		);

		await nextButton.click();
		await expect(page.locator("#refresh")).toHaveClass(/driver-active-element/);

		await page.locator("#refresh").click();

		await expect(page.locator("#driver-popover")).toBeHidden();
	});
});
