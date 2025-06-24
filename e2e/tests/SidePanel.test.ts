import { expect, test } from "./fixtures";

test.describe("SidePanel", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Login with Test" }).click();
		await page.waitForURL(/.*memos/);

		await page.goto("https://blog.toss.im/article/toss-team-culture");
		await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
	});

	test("메모가 입력된다.", async ({ sidePanelPage }) => {
		sidePanelPage.waitForTimeout(1000);

		const text = String(new Date());
		sidePanelPage.locator("#memo-textarea").fill(text);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveText(text);
	});

	test("Command + S를 누르면 메모가 저장된다.", async ({ sidePanelPage }) => {
		const text = String(new Date());

		await sidePanelPage.locator("#memo-textarea").fill(text);
		await sidePanelPage.locator("#memo-textarea").press("ControlOrMeta+s");

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveText(text);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveText(text);

		await sidePanelPage.reload();
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveText(text);
	});
});
