import type { BrowserContext, Page } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import path from "node:path";

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const pathToExtension = path.join(path.resolve(), "..", "dist");

type ExtensionFixture = {
	context: BrowserContext;
	sidePanelPage: Page;
	loginedPage: Page;
};

export const test = base.extend<ExtensionFixture>({
	context: async ({}, use) => {
		const context = await chromium.launchPersistentContext("", {
			headless: false,
			args: [
				`--headless=new`,
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});
		await use(context);
		await context.close();
	},
	sidePanelPage: async ({ page }, use) => {
		const sidePanelPage = page
			.context()
			.pages()
			.find(
				(page) =>
					page.url() ===
					"chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html",
			)!;
		use(sidePanelPage);
	},
	loginedPage: async ({ page }, use) => {
		await page.goto("/en/login");
		await page.getByTestId("test-login-button").click();
		await page.waitForURL(new RegExp(PATHS.memos));
		use(page);
	},
	baseURL: "http://localhost:3000",
});
export const expect = test.expect;
