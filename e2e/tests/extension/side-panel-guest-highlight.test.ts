import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, openSidePanel } from "../lib";

const URL = "https://example.com/guest-highlight";
const TEST_TEXT = "First selectable passage and second selectable passage.";
const QUOTE = TEST_TEXT.slice(0, 24);
const TOOLBAR = "#WEB_MEMO_HIGHLIGHT_TOOLTIP";

/**
 * 로그인하지 않아도 하이라이트가 이 기기(chrome.storage.local)에 저장되고, 새로고침 뒤 복원되며,
 * 사이드 패널 목록에 보인다. 서버로 가는 요청은 supabaseGuard fixture가 막아 테스트를 실패시킨다.
 */
test("비로그인에서 하이라이트를 저장하면 기기에 쌓이고 새로고침 후 복원되며 패널 목록에 보인다 (Mocked)", async ({
	page,
	context,
}) => {
	await context.route("https://example.com/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<p id="e2e-highlight-passage">${TEST_TEXT}</p>`,
		}),
	);
	await page.goto(URL);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await panel.evaluate(async () => {
		await chrome.storage.sync.set({
			highlightBubbleEnabled: true,
			highlightIntroSeen: true,
			highlightDisabledSites: [],
		});
	});
	const labels = await panel.evaluate(() => ({
		create: chrome.i18n.getMessage("highlight_create"),
		yellow: chrome.i18n.getMessage("highlight_color_yellow"),
	}));

	await selectPassage(page, 0, 24);
	const toolbar = page
		.locator(TOOLBAR)
		.getByRole("toolbar", { name: labels.create });
	await expect(toolbar).toBeVisible();
	await toolbar.getByRole("button", { name: labels.yellow }).click();

	await expect
		.poll(() => readLocalHighlights(panel))
		.toEqual([
			expect.objectContaining({
				exact_text: QUOTE,
				user_id: "",
				id: expect.any(Number),
			}),
		]);
	const [saved] = await readLocalHighlights(panel);
	expect(saved.id).toBeLessThan(0);

	const region = panel.getByRole("region", {
		name: /Highlights on this page|이 페이지의 하이라이트/,
	});
	await expect(region.getByRole("button", { name: QUOTE })).toBeVisible();

	await page.reload();
	await expect
		.poll(() =>
			page.evaluate(() => (CSS.highlights as unknown as { size: number }).size),
		)
		.toBeGreaterThan(0);
	await expect(region.getByRole("button", { name: QUOTE })).toBeVisible();
});

test("비로그인에서 저장된 하이라이트를 누르면 연결 메모 대신 기기에만 있다는 안내가 보인다 (Mocked)", async ({
	page,
	context,
}) => {
	await context.route("https://example.com/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<p id="e2e-highlight-passage" style="margin:40px">${TEST_TEXT}</p>`,
		}),
	);
	await page.goto(URL);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await panel.evaluate(async () => {
		await chrome.storage.sync.set({
			highlightBubbleEnabled: true,
			highlightIntroSeen: true,
			highlightDisabledSites: [],
		});
	});
	const labels = await panel.evaluate(() => ({
		create: chrome.i18n.getMessage("highlight_create"),
		yellow: chrome.i18n.getMessage("highlight_color_yellow"),
		edit: chrome.i18n.getMessage("highlight_edit"),
		guestMessage: chrome.i18n.getMessage("guest_web_link_message"),
	}));
	await selectPassage(page, 0, 24);
	await page
		.locator(TOOLBAR)
		.getByRole("toolbar", { name: labels.create })
		.getByRole("button", { name: labels.yellow })
		.click();
	await expect.poll(() => readLocalHighlights(panel)).toHaveLength(1);
	await page.evaluate(() => document.getSelection()?.removeAllRanges());

	const point = await page.evaluate((length) => {
		const text = document.querySelector("#e2e-highlight-passage")?.firstChild;
		if (!text) throw new Error("E2E passage is missing");
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, length);
		const rect = range.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	}, QUOTE.length);
	await page.mouse.click(point.x, point.y);

	const editToolbar = page
		.locator(TOOLBAR)
		.getByRole("toolbar", { name: labels.edit });
	await expect(editToolbar).toBeVisible();
	await expect(editToolbar.getByText(labels.guestMessage)).toBeVisible();
});

const readLocalHighlights = (panel: Page) =>
	panel.evaluate(async () => {
		const { guestHighlights } =
			await chrome.storage.local.get("guestHighlights");
		return (guestHighlights?.highlights ?? []) as {
			id: number;
			exact_text: string;
			user_id: string;
		}[];
	});

async function selectPassage(page: Page, start: number, end: number) {
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
