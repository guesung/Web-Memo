import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 옵션 페이지가 쓰는 것과 같은 sync 저장소 키를 확장 background에서 직접 바꾼다. */
const setAiFeatures = async (
	page: Page,
	features: { summaryEnabled?: boolean; aiChatEnabled?: boolean },
) => {
	const background = page.context().serviceWorkers()[0];
	await background.evaluate(
		(values) => chrome.storage.sync.set(values),
		features,
	);
};

test.describe("사이드 패널 AI 기능 ON/OFF", () => {
	test.beforeEach(async ({ page, context }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
		await context.route("https://example.com/**", async (route) => {
			await route.fulfill({
				contentType: "text/html",
				body: "<h1>AI feature toggle test</h1>",
			});
		});
		await login(page);
		await skipGuide(page);
	});

	test("한 기능만 끄면 켜진 탭만 1열로 남고, 열려 있는 패널에도 바로 반영된다", async ({
		page,
	}) => {
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		const tabs = sidePanelPage.getByRole("tab");
		await expect(tabs).toHaveCount(2);

		await setAiFeatures(page, { summaryEnabled: false });

		await expect(tabs).toHaveCount(1);
		await expect(tabs.first()).toHaveText(/^(AI Chat|AI 채팅)/);
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
		await expect(sidePanelPage.getByRole("tablist")).toHaveClass(/grid-cols-1/);

		await setAiFeatures(page, { summaryEnabled: true, aiChatEnabled: false });

		await expect(tabs).toHaveCount(1);
		await expect(tabs.first()).toHaveText(/^(Summary|요약)/);
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
	});

	test("둘 다 끄면 탭 영역과 크기 조절 핸들이 사라지고 메모 입력창은 그대로 쓴다", async ({
		page,
	}) => {
		await setAiFeatures(page, { summaryEnabled: false, aiChatEnabled: false });
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("main > [role=slider]")).toHaveCount(0);
	});

	test("값이 없으면 둘 다 켜진 기존 화면 그대로다", async ({ page }) => {
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		await expect(sidePanelPage.getByRole("tab")).toHaveCount(2);
		await expect(sidePanelPage.locator("main > [role=slider]")).toHaveCount(1);
	});
});
