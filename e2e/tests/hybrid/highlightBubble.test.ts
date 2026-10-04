import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const TEST_TEXT = "First selectable passage and second selectable passage.";
const TOOLBAR = "#WEB_MEMO_HIGHLIGHT_TOOLTIP";

test("선택을 마치면 버블이 뜨고 X는 현재 선택만 닫으며 설정은 톱니에서 연다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await sidePanelPage.evaluate(async () => {
		await chrome.storage.sync.set({
			highlightBubbleEnabled: true,
			highlightIntroSeen: true,
			highlightDisabledSites: [],
		});
	});
	const settingsBefore = await sidePanelPage.evaluate(async () =>
		chrome.storage.sync.get([
			"highlightBubbleEnabled",
			"highlightDisabledSites",
		]),
	);
	const labels = await sidePanelPage.evaluate(() => ({
		create: chrome.i18n.getMessage("highlight_create"),
		yellow: chrome.i18n.getMessage("highlight_color_yellow"),
		note: chrome.i18n.getMessage("highlight_note"),
		settings: chrome.i18n.getMessage("highlight_bubble_settings"),
		dismiss: chrome.i18n.getMessage("highlight_bubble_dismiss"),
		disableSite: chrome.i18n.getMessage("highlight_bubble_disable_site"),
		disableAll: chrome.i18n.getMessage("highlight_bubble_disable_all"),
	}));

	await page.evaluate((text) => {
		const passage = document.createElement("p");
		passage.id = "e2e-highlight-passage";
		passage.textContent = text;
		document.body.append(passage);
	}, TEST_TEXT);
	const toolbar = page.locator(TOOLBAR).getByRole("toolbar", {
		name: labels.create,
	});

	await selectPassage(page, 0, 24);
	await expect(toolbar).toBeVisible();
	await expect(
		toolbar.getByRole("button", { name: labels.yellow }),
	).toBeVisible();
	await expect(
		toolbar.getByRole("button", { name: labels.note }),
	).toBeVisible();
	await expect(
		toolbar.getByRole("button", { name: labels.settings }),
	).toBeVisible();
	await toolbar.getByRole("button", { name: labels.dismiss }).click();
	await expect(toolbar).toBeHidden();
	await expect
		.poll(() => page.evaluate(() => document.getSelection()?.toString()))
		.toBe(TEST_TEXT.slice(0, 24));
	expect(
		await sidePanelPage.evaluate(async () =>
			chrome.storage.sync.get([
				"highlightBubbleEnabled",
				"highlightDisabledSites",
			]),
		),
	).toEqual(settingsBefore);

	await page.evaluate(() =>
		document.dispatchEvent(new Event("selectionchange")),
	);
	// 선택 변경 처리의 150 ms 타이머가 지나도 같은 범위는 다시 열리지 않아야 한다.
	await page.waitForTimeout(250);
	await expect(toolbar).toBeHidden();

	await selectPassage(page, 29, 54);
	await expect(toolbar).toBeVisible();
	await toolbar.getByRole("button", { name: labels.settings }).click();
	await expect(toolbar.getByRole("menu")).toBeVisible();
	await expect(
		toolbar.getByRole("menuitem", { name: new RegExp(labels.disableSite) }),
	).toBeVisible();
	await expect(
		toolbar.getByRole("menuitem", { name: labels.disableAll }),
	).toBeVisible();
});

test("드래그 중에는 버블이 숨고 포인터를 놓으면 나타난다", async ({ page }) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await sidePanelPage.evaluate(async () => {
		await chrome.storage.sync.set({
			highlightBubbleEnabled: true,
			highlightIntroSeen: true,
			highlightDisabledSites: [],
		});
	});
	await page.evaluate((text) => {
		const passage = document.createElement("p");
		passage.id = "e2e-highlight-passage";
		passage.textContent = text;
		document.body.append(passage);
	}, TEST_TEXT);
	const toolbar = page.locator(TOOLBAR).getByRole("toolbar");

	await page.evaluate(() =>
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true }),
		),
	);
	await selectPassage(page, 0, 24);
	await page.waitForTimeout(250);
	await expect(toolbar).toBeHidden();
	await page.evaluate(() =>
		document.body.dispatchEvent(
			new PointerEvent("pointerup", { bubbles: true }),
		),
	);
	await expect(toolbar).toBeVisible();
});

async function selectPassage(
	page: import("@playwright/test").Page,
	start: number,
	end: number,
) {
	await page.evaluate(
		({ start, end }) => {
			const text = document.querySelector("#e2e-highlight-passage")?.firstChild;
			if (!text) throw new Error("E2E passage is missing");
			const range = document.createRange();
			range.setStart(text, start);
			range.setEnd(text, end);
			const selection = document.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			document.dispatchEvent(new Event("selectionchange"));
		},
		{ start, end },
	);
}
