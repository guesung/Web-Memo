import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import {
	cleanupTestData,
	E2E_SIDE_PANEL_HOST_URL,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

/**
 * Arc처럼 `chrome.sidePanel.open()`이 에러 없이 끝나지 않는 브라우저를 흉내 낸다.
 * @description Arc는 sidePanel API를 노출하지만 패널을 그리지 않는다. 존재 여부가 아니라
 * "열리는가"로 판정하는 background 경로를 타게 하려고, 서비스 워커의 open만 바꿔치운다.
 */
const emulateSidePanelUnsupported = async (context: BrowserContext) => {
	const serviceWorker =
		context.serviceWorkers()[0] ??
		(await context.waitForEvent("serviceworker"));

	await serviceWorker.evaluate(() => {
		chrome.sidePanel.open = () => new Promise<void>(() => {});
	});
};

const getFloatingPanelIframe = (page: Page) =>
	page.locator("#WEB_MEMO_FLOATING_PANEL_IFRAME");

const getFloatingPanelMemoTextarea = (page: Page) =>
	page
		.frameLocator("#WEB_MEMO_FLOATING_PANEL_IFRAME")
		.locator("#memo-textarea");

test.describe("FloatingPanel - Integration", () => {
	test.beforeEach(async ({ page, context }) => {
		await login(page);
		await skipGuide(page);
		await emulateSidePanelUnsupported(context);
	});

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls: [E2E_SIDE_PANEL_HOST_URL] });
	});

	test("사이드 패널이 열리지 않는 브라우저에서 패널을 열면, 페이지 위에 플로팅 패널이 뜨고 메모를 저장할 수 있다.", async ({
		page,
	}) => {
		await openSidePanel(page);
		await expect(getFloatingPanelIframe(page)).toBeVisible();

		const memoTextarea = getFloatingPanelMemoTextarea(page);
		const text = String(new Date());
		const memoSaving = page.waitForResponse(
			(response) =>
				response.url().includes("/rest/v1/memo") &&
				response.request().method() !== "GET" &&
				response.ok(),
		);
		await memoTextarea.fill(text);
		await memoSaving;

		await page.reload();
		await openSidePanel(page);
		await expect(getFloatingPanelMemoTextarea(page)).toHaveValue(text);
	});

	test("플로팅 패널의 닫기 버튼을 누르면 패널이 사라지고, 다시 열면 같은 패널이 보인다.", async ({
		page,
	}) => {
		await openSidePanel(page);
		await expect(getFloatingPanelIframe(page)).toBeVisible();

		await page.locator("#WEB_MEMO_FLOATING_PANEL_CLOSE_BUTTON").click();
		await expect(getFloatingPanelIframe(page)).toBeHidden();

		await openSidePanel(page);
		await expect(getFloatingPanelIframe(page)).toBeVisible();
	});
});
