import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { getExtensionUrl } from "@web-memo/shared/constants";

const SIDE_PANEL_URL = getExtensionUrl("side-panel/index.html");

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

export async function openSidePanel(page: Page) {
	await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
}

export async function findSidePanelPage(page: Page, timeout = 10000) {
	const context = page.context();
	const startTime = Date.now();

	// Poll for side panel page instead of fixed wait
	while (Date.now() - startTime < timeout) {
		const sidePanelPage = context
			.pages()
			.find((p) => p.url() === SIDE_PANEL_URL);
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

/**
 * 확장이 있을 때만 뜨는 첫 방문 가이드를 끈다.
 * @description 웹은 확장 manifest를 받아야 가이드를 시작하므로(apps/web/src/modules/guide/useGuide.ts)
 * 확장 없이 도는 web 프로젝트에는 필요 없다.
 */
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
		await guidePopover
			.waitFor({ state: "hidden", timeout: 5000 })
			.catch(() => {});
	}
}
