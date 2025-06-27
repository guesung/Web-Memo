import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect } from "../fixtures";
import { LANGUAGE } from "./constants";

export async function fillMemo(page: Page, text: string) {
	await page.locator("#memo-textarea").fill(text);
	await expect(page.locator("#memo-textarea")).toHaveValue(text);
	await page.waitForTimeout(1000);
}

interface GotoSafeParams {
	page: Page;
	url: string;
	regexp: RegExp;
}

export async function gotoSafely({ page, url, regexp }: GotoSafeParams) {
	await page.goto(url);
	await page.waitForURL(regexp);
}

export async function openSidePanel(page: Page) {
	await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
}

export async function login(page: Page) {
	await page.goto(`/${LANGUAGE}${PATHS.login}`);
	await page.waitForURL(new RegExp(PATHS.login));

	await page.getByTestId("test-login-button").click();
	await page.waitForURL(new RegExp(PATHS.memos));
}

export async function findSidePanelPage(page: Page) {
	await page.waitForTimeout(5000);

	return page
		.context()
		.pages()
		.find(
			(page) =>
				page.url() ===
				"chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html",
		)!;
}

export async function skipGuide(page: Page) {
	do {
		await page.locator(".driver-popover-next-btn").click();
	} while (
		!(await page.getByText("🎉 Guide completed.", { exact: true }).isVisible())
	);
}
