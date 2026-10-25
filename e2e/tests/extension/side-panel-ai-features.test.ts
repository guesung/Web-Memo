import type { Page } from "@playwright/test";
import { getExtensionUrl } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockSetting,
	MockSupabaseStore,
	mockSummaryApi,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("사이드 패널 AI 기능", () => {
	let store: MockSupabaseStore;
	let summaryApi: Awaited<ReturnType<typeof mockSummaryApi>>;

	test.beforeEach(async ({ page, context }) => {
		await context.route(
			/https:\/\/[^/]*(google-analytics\.com|analytics\.google\.com)\//,
			(route) => route.fulfill({ status: 204 }),
		);
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
		summaryApi = await mockSummaryApi({
			context,
			summaryChunks: ["E2E mock summary"],
		});
		await context.route("https://example.com/**", async (route) => {
			await route.fulfill({
				contentType: "text/html",
				body: "<h1>AI feature toggle test</h1><p>Readable page content.</p>",
			});
		});
		await login(page);
		await skipGuide(page);
	});

	test("설정 행이 없으면 요약 진입점이 보이고 생성 전까지 메모를 쓸 수 있다", async ({
		page,
	}) => {
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		const showLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_show_label",
		);

		await expect(
			sidePanelPage.getByRole("button", { name: showLabel, exact: true }),
		).toBeVisible();
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("main [role=slider]")).toHaveCount(0);
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
		expect(store.getSetting()).toBeNull();
	});

	test("첫 설정 저장은 요약 기본 ON을 보존한다", async ({ page }) => {
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));
		const summarySwitch = optionsPage.locator("#summary-enabled");
		const chatSwitch = optionsPage.locator("#ai-chat-enabled");

		await expect(summarySwitch).toHaveAttribute("data-state", "checked");
		await expect(chatSwitch).toHaveAttribute("data-state", "unchecked");
		await chatSwitch.click();
		await expect.poll(() => store.getSetting()?.show_ai_chat).toBe(true);
		expect(store.getSetting()?.show_summary).toBe(true);
		await expect(summarySwitch).toHaveAttribute("data-state", "checked");
	});

	test("요약 OFF 설정은 요약 진입점과 영역을 숨긴다", async ({ page }) => {
		store.setSetting(createMockSetting({ show_summary: false }));
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		const showLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_show_label",
		);
		const showButton = sidePanelPage.getByRole("button", {
			name: showLabel,
			exact: true,
		});

		await expect(showButton).toHaveCount(0);
		await expect(sidePanelPage.locator("#side-panel-summary")).toHaveCount(0);
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
		expect(store.getSetting()?.show_summary).toBe(false);
	});

	test("채팅 ON이면 처음에는 채팅을 보이고 요약을 접으면 채팅으로 돌아온다", async ({
		page,
	}) => {
		store.setSetting(
			createMockSetting({ show_summary: true, show_ai_chat: true }),
		);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		const showLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_show_label",
		);
		const hideLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_hide_label",
		);

		await expect(sidePanelPage.getByRole("tab")).toHaveCount(1);
		await expect(sidePanelPage.getByRole("tab").first()).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await sidePanelPage
			.getByRole("button", { name: showLabel, exact: true })
			.click();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.getByText("E2E mock summary")).toBeVisible();
		await expect(sidePanelPage.locator("main [role=slider]")).toHaveCount(1);
		await sidePanelPage
			.getByRole("button", { name: hideLabel, exact: true })
			.click();
		await expect(sidePanelPage.getByRole("tab")).toHaveCount(1);
		await expect(sidePanelPage.getByRole("tab").first()).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});

	test("옵션 변경이 열린 패널에 반영되고 메모 초안과 채팅 설정을 보존한다", async ({
		page,
	}) => {
		store.setSetting(createMockSetting());
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));
		const hint = await getExtensionMessage(optionsPage, "summary_panel_hint");

		const summarySwitch = optionsPage.locator("#summary-enabled");
		await expect(summarySwitch).toHaveAttribute("data-state", "unchecked");
		await expect(optionsPage.getByText(hint, { exact: true })).toBeVisible();
		const chatSwitch = optionsPage.locator("#ai-chat-enabled");
		await expect(chatSwitch).toHaveAttribute("data-state", "unchecked");
		await chatSwitch.click();
		await expect(chatSwitch).toHaveAttribute("data-state", "checked");
		await expect.poll(() => store.getSetting()?.show_ai_chat).toBe(true);
		await openSidePanel(page);
		const sidePanelPage = await findSidePanelPage(page);
		await page.goto("https://example.com/ai-feature-toggle");
		await page.bringToFront();
		await expect
			.poll(() =>
				sidePanelPage.evaluate(async () => {
					const [tab] = await chrome.tabs.query({
						active: true,
						currentWindow: true,
					});
					return tab?.url;
				}),
			)
			.toBe("https://example.com/ai-feature-toggle");
		const memo = sidePanelPage.locator("#memo-textarea");
		await memo.fill("Keep this draft");
		const showLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_show_label",
		);
		const hideLabel = await getExtensionMessage(
			sidePanelPage,
			"summary_hide_label",
		);
		const showButton = sidePanelPage.getByRole("button", {
			name: showLabel,
			exact: true,
		});
		await expect(showButton).toHaveCount(0);
		await summarySwitch.evaluate((element: HTMLElement) => element.click());
		await expect(showButton).toBeVisible();
		await expect
			.poll(() =>
				sidePanelPage.evaluate(async () => {
					const [tab] = await chrome.tabs.query({
						active: true,
						currentWindow: true,
					});
					return tab?.url;
				}),
			)
			.toBe("https://example.com/ai-feature-toggle");
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
		await showButton.click();
		await expect(sidePanelPage.getByText("E2E mock summary")).toBeVisible();
		await summarySwitch.evaluate((element: HTMLElement) => element.click());
		await expect(
			sidePanelPage.getByRole("button", { name: hideLabel, exact: true }),
		).toHaveCount(0);
		await expect(sidePanelPage.locator("#side-panel-summary")).toHaveCount(0);
		await expect(memo).toHaveValue("Keep this draft");
		await expect(sidePanelPage.getByRole("tab")).toHaveCount(1);
		await summarySwitch.evaluate((element: HTMLElement) => element.click());
		await expect(showButton).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
		await showButton.click();
		await expect(sidePanelPage.getByText("E2E mock summary")).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});
});

const getExtensionMessage = async (extensionPage: Page, key: string) => {
	const message = await extensionPage.evaluate(
		(messageKey) => chrome.i18n.getMessage(messageKey),
		key,
	);
	if (!message) {
		throw new Error(`확장 번역 문구가 없습니다: ${key}`);
	}
	return message;
};
