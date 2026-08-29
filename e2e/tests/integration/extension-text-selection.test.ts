import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { getExtensionUrl, LANGUAGE } from "../lib";

const SELECTION_BUTTON = 'button[aria-label="Save selected text as memo"]';

/**
 * 페이지에서 가장 먼저 나오는 긴 문단을 실제로 선택하고 mouseup을 흘린다.
 * @description content script는 document의 mouseup에서 window.getSelection()을 읽는다.
 * 마우스 드래그로 선택하면 영역이 페이지 레이아웃을 타 불안정하므로 Range로 직접 만든다.
 */
async function selectFirstParagraph(page: Page) {
	await page.evaluate(() => {
		const target = Array.from(document.querySelectorAll("p, h1, h2, li")).find(
			(element) => (element.textContent ?? "").trim().length >= 10,
		);

		if (!target) throw new Error("선택할 만한 문단을 찾지 못했다");

		const range = document.createRange();
		range.selectNodeContents(target);

		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);

		document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	});
}

/** 확장 저장소에 값을 넣는다. content script는 로드 시점에 이 값을 읽는다. */
async function setSyncStorage(page: Page, values: Record<string, unknown>) {
	const extensionPage = await page.context().newPage();
	await extensionPage.goto(getExtensionUrl("options/index.html"));
	await extensionPage.evaluate(
		(stored) => chrome.storage.sync.set(stored),
		values,
	);
	await extensionPage.close();
}

test.describe("확장 텍스트 선택 메모 버튼", () => {
	test("설정이 켜져 있으면, 텍스트를 선택했을 때 메모 저장 버튼이 뜬다.", async ({
		page,
	}) => {
		await setSyncStorage(page, { textSelectionEnabled: true });

		await page.goto(`/${LANGUAGE}${PATHS.introduce}`);
		await selectFirstParagraph(page);

		await expect(page.locator(SELECTION_BUTTON)).toBeVisible();
	});

	test("선택을 해제하면, 메모 저장 버튼이 사라진다.", async ({ page }) => {
		await setSyncStorage(page, { textSelectionEnabled: true });

		await page.goto(`/${LANGUAGE}${PATHS.introduce}`);
		await selectFirstParagraph(page);
		await expect(page.locator(SELECTION_BUTTON)).toBeVisible();

		await page.mouse.click(5, 5);

		await expect(page.locator(SELECTION_BUTTON)).toHaveCount(0);
	});

	test("설정이 꺼진 기본 상태에서는, 텍스트를 선택해도 버튼이 뜨지 않는다.", async ({
		page,
	}) => {
		await page.goto(`/${LANGUAGE}${PATHS.introduce}`);
		await selectFirstParagraph(page);

		await expect(page.locator(SELECTION_BUTTON)).toHaveCount(0);
	});
});
