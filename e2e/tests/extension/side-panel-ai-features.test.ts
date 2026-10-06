import { getExtensionUrl } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 요약·AI 채팅 표시 여부는 서버 설정(setting)에 있고, 행이 없으면 둘 다 꺼짐이다. */
test.describe("사이드 패널 AI 기능 ON/OFF", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page, context }) => {
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
		await context.route("https://example.com/**", async (route) => {
			await route.fulfill({
				contentType: "text/html",
				body: "<h1>AI feature toggle test</h1>",
			});
		});
		await login(page);
		await skipGuide(page);
	});

	test("설정 행이 없으면 탭 영역과 크기 조절 핸들 없이 메모 입력창만 쓴다", async ({
		page,
	}) => {
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("main > [role=slider]")).toHaveCount(0);
	});

	test("둘 다 꺼진 설정이면 탭 영역이 없다", async ({ page }) => {
		store.setSetting(createMockSetting());
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
	});

	test("둘 다 켜진 설정이면 요약·AI 채팅 탭과 크기 조절 핸들이 보인다", async ({
		page,
	}) => {
		store.setSetting(
			createMockSetting({ show_summary: true, show_ai_chat: true }),
		);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		await expect(sidePanelPage.getByRole("tab")).toHaveCount(2);
		await expect(sidePanelPage.locator("main > [role=slider]")).toHaveCount(1);
	});

	test("한 기능만 켜면 켜진 탭만 1열로 남는다", async ({ page }) => {
		store.setSetting(createMockSetting({ show_ai_chat: true }));
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");

		const tabs = sidePanelPage.getByRole("tab");
		await expect(tabs).toHaveCount(1);
		await expect(tabs.first()).toHaveText(/^(AI Chat|AI 채팅)/);
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
		await expect(sidePanelPage.getByRole("tablist")).toHaveClass(/grid-cols-1/);
	});

	test("옵션에서 켜면 열려 있는 패널에 바로 반영된다", async ({ page }) => {
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tab")).toHaveCount(0);

		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));
		const summarySwitch = optionsPage.locator("#summary-enabled");
		await expect(summarySwitch).toBeEnabled();
		await summarySwitch.click();
		await expect(
			optionsPage.getByText(/^(Saved|저장했어요)$/).last(),
		).toBeVisible();

		const tabs = sidePanelPage.getByRole("tab");
		await expect(tabs).toHaveCount(1);
		await expect(tabs.first()).toHaveText(/^(Summary|요약)/);
	});
});
