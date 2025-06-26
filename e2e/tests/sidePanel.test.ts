import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// 사이드패널이 열릴 때까지 기다리는 함수
async function waitForSidePanelPage(
	context: BrowserContext,
	url: string,
	timeout = 10 * 1000,
) {
	// 이미 열려있으면 바로 반환
	const existing = context.pages().find((page) => page.url() === url);
	if (existing) return existing;

	// 새 페이지가 열릴 때까지 대기
	return new Promise<Page>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error("Side panel not found")),
			timeout,
		);
		context.on("page", (page) => {
			if (page.url() === url) {
				clearTimeout(timer);
				resolve(page);
			}
		});
	});
}

test.describe.configure({ mode: "serial" });

test.describe("SidePanel", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/en/login");
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(/.*memos/);

		await page.goto("https://blog.toss.im/article/toss-team-culture");
		await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
	});

	test("메모가 입력된다.", async ({ page }) => {
		const sidePanelPage = await waitForSidePanelPage(
			page.context(),
			"chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html",
		);

		sidePanelPage.waitForTimeout(1000);

		const text = String(new Date());
		sidePanelPage.locator("#memo-textarea").fill(text);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
	});

	test("Command + S를 누르면 메모가 저장된다.", async ({ page }) => {
		const sidePanelPage = await waitForSidePanelPage(
			page.context(),
			"chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html",
		);

		const text = String(new Date());

		await sidePanelPage.locator("#memo-textarea").fill(text);

		await sidePanelPage.waitForTimeout(1000);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(text);
	});
});
