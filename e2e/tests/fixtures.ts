import path from "node:path";
import type { BrowserContext } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const pathToExtension = path.join(path.resolve(), "..", "dist");

type ExtensionFixture = {
	context: BrowserContext;
};

export const test = base.extend<ExtensionFixture>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture API requires empty destructuring
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
	baseURL: "http://localhost:3000",
});
export const expect = test.expect;
