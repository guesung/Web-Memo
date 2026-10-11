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

	test("설정 행이 없어도 요약 진입점이 보이고 메모를 먼저 쓸 수 있다", async ({
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
		).toBeEnabled();
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("main [role=slider]")).toHaveCount(0);
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
	});

	test("기존 요약 OFF 설정도 수동으로 요약을 열 수 있다", async ({ page }) => {
		store.setSetting(createMockSetting({ show_summary: false }));
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
		const showButton = sidePanelPage.getByRole("button", {
			name: showLabel,
			exact: true,
		});

		await expect(showButton).toHaveAttribute("aria-expanded", "false");
		await showButton.click();
		await expect(
			sidePanelPage.getByRole("button", { name: hideLabel, exact: true }),
		).toHaveAttribute("aria-expanded", "true");
		await expect(sidePanelPage.getByText("E2E mock summary")).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
		expect(store.getSetting()?.show_summary).toBe(false);
	});

	test("채팅 ON이면 처음에는 채팅을 보이고 요약을 접으면 채팅으로 돌아온다", async ({
		page,
	}) => {
		store.setSetting(
			createMockSetting({ show_summary: false, show_ai_chat: true }),
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

	test("옵션에는 요약 스위치 대신 안내가 있고 채팅 스위치는 저장된다", async ({
		page,
	}) => {
		store.setSetting(createMockSetting());
		const optionsPage = await page.context().newPage();
		await optionsPage.goto(getExtensionUrl("options/index.html"));
		const hint = await getExtensionMessage(optionsPage, "summary_panel_hint");

		await expect(optionsPage.locator("#summary-enabled")).toHaveCount(0);
		await expect(optionsPage.getByText(hint, { exact: true })).toBeVisible();
		const chatSwitch = optionsPage.locator("#ai-chat-enabled");
		await expect(chatSwitch).toHaveAttribute("data-state", "unchecked");
		await chatSwitch.click();
		await expect(chatSwitch).toHaveAttribute("data-state", "checked");
		await expect.poll(() => store.getSetting()?.show_ai_chat).toBe(true);
		expect(store.getSetting()?.show_summary).toBe(false);
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
