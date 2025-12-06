import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect } from "../fixtures";
import { LANGUAGE } from "./constants";

const EXTENSION_URL =
	"chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html";

export async function fillMemo(page: Page, text: string) {
	await page.locator("#memo-textarea").fill(text);
	await expect(page.locator("#memo-textarea")).toHaveValue(text);

	// Wait for debounced save to complete (network request)
	await page
		.waitForResponse(
			(response) => response.url().includes("/rest/v1/memo") && response.ok(),
			{ timeout: 5000 },
		)
		.catch(() => {
			// Fallback: wait for a short time if no network request detected
			return page.waitForTimeout(500);
		});
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

export async function findSidePanelPage(page: Page, timeout = 10000) {
	const context = page.context();
	const startTime = Date.now();

	// Poll for side panel page instead of fixed wait
	while (Date.now() - startTime < timeout) {
		const sidePanelPage = context
			.pages()
			.find((p) => p.url() === EXTENSION_URL);
		if (sidePanelPage) {
			// Wait for the side panel to be ready
			await sidePanelPage
				.waitForSelector("#memo-textarea", { state: "visible", timeout: 5000 })
				.catch(() => {});
			return sidePanelPage;
		}
		await page.waitForTimeout(100); // Short polling interval
	}
	throw new Error(`Side panel page not found within ${timeout}ms`);
}

export async function skipGuide(page: Page) {
	// Set localStorage to mark guide as completed FIRST before any guide can appear
	await page.evaluate(() => {
		localStorage.setItem("guide", JSON.stringify(true));
	});

	const guidePopover = page.locator("#driver-popover-content");

	// Check if guide is visible
	const isGuideVisible = await guidePopover
		.waitFor({ state: "visible", timeout: 2000 })
		.then(() => true)
		.catch(() => false);

	if (isGuideVisible) {
		// Guide is already showing, reload to dismiss it
		await page.reload();
		await page.waitForLoadState("domcontentloaded");
		// Wait for guide to be hidden
		await guidePopover.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
	}
}
