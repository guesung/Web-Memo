import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { LANGUAGE } from "./constants";

interface GotoSafeParams {
	page: Page;
	url: string;
	regexp: RegExp;
}

export async function gotoSafely({ page, url, regexp }: GotoSafeParams) {
	await page.goto(url);
	await page.waitForURL(regexp);
}

export async function login(page: Page) {
	await page.goto(`/${LANGUAGE}${PATHS.login}`);
	await page.waitForURL(new RegExp(PATHS.login));

	await page.getByTestId("test-login-button").click();
	await page.waitForURL(new RegExp(PATHS.memos));
}
