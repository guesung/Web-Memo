import { REGEXR } from "../lib/constants";
import { expect, test } from "./fixtures";

test.describe("메모 생성 기능", () => {
	test.beforeEach(async ({ page, baseURL }) => {
		await page.goto("/en/memos", {
			waitUntil: "domcontentloaded",
		});
		await page.getByRole("button", { name: "Login with Test" }).click();
		await page.waitForURL(REGEXR.page.memos);

		await page.goto("https://blog.toss.im/article/toss-team-culture");
		await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();

		await page.goto(baseURL!);
	});
	const text = String(new Date());
	test("사이드 패널에서 메모를 저장하면 메모를 확인할 수 있다.", async ({
		page,
		sidePanelPage,
	}) => {
		await sidePanelPage.locator("#memo-textarea").fill(text);
		await page.waitForTimeout(1000);
		await page.reload();
		await page.waitForTimeout(1000);
		await expect(page.getByText(text)).toBeVisible();
	});
});
