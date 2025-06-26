import type { Page } from "@playwright/test";
import { expect } from "../fixtures";

export async function fillMemo(page: Page, text: string) {
	page.locator("#memo-textarea").fill(text);
	await expect(page.locator("#memo-textarea")).toHaveValue(text);
}

export async function openSidePanel(page: Page) {
	await page.goto("https://blog.toss.im/article/toss-team-culture");
	await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
	await page.waitForTimeout(1000);
}
