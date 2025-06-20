import type { BrowserContext, Page } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";
import path from "path";

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const pathToExtension = path.join(path.resolve(), "dist");

type ExtensionFixture = {
	context: BrowserContext;
	sidePanelPage: Page;
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
	baseURL: "http://localhost:3000",
});
export const expect = test.expect;
