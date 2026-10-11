import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockHighlight,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const NO_QUOTE = "No-quote memo";
const ONE_QUOTE = "One-quote memo";
const MANY_QUOTES = "Many-quotes memo";
const FIRST_QUOTE = "Quoted excerpt one";
const SECOND_QUOTE = "Quoted excerpt two";
const THIRD_QUOTE = "Quoted excerpt three";

test.beforeEach(async ({ page }) => {
	resetMockIds();
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ title: NO_QUOTE }));
	const oneQuoteMemo = store.addMemo(createMockMemo({ title: ONE_QUOTE }));
	const manyQuotesMemo = store.addMemo(createMockMemo({ title: MANY_QUOTES }));
	store.addHighlight(
		createMockHighlight({ url: oneQuoteMemo.url, exact_text: FIRST_QUOTE }),
	);
	store.addHighlight(
		createMockHighlight({ url: manyQuotesMemo.url, exact_text: SECOND_QUOTE }),
	);
	store.addHighlight(
		createMockHighlight({ url: manyQuotesMemo.url, exact_text: THIRD_QUOTE }),
	);
	await setupSupabaseMocks(page, store);
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});
});

test("카드에는 인용문 대신 양수인 하이라이트 개수만 표시한다.", async ({
	page,
}) => {
	const noQuoteCard = page.locator(".memo-item", { hasText: NO_QUOTE });
	const oneQuoteCard = page.locator(".memo-item", { hasText: ONE_QUOTE });
	const manyQuotesCard = page.locator(".memo-item", { hasText: MANY_QUOTES });

	await expect(noQuoteCard).toBeVisible();
	await expect(noQuoteCard).not.toContainText("Highlights (");
	await expect(oneQuoteCard).toContainText("Highlights (1)");
	await expect(manyQuotesCard).toContainText("Highlights (2)");
	await expect(oneQuoteCard).not.toContainText(FIRST_QUOTE);
	await expect(manyQuotesCard).not.toContainText(SECOND_QUOTE);
	await expect(manyQuotesCard).not.toContainText(THIRD_QUOTE);
});

test("카드에서 제거한 인용문은 상세 다이얼로그에서 계속 읽을 수 있다.", async ({
	page,
}) => {
	await page.locator(".memo-item", { hasText: MANY_QUOTES }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const expandHighlights = dialog.getByRole("button", {
		name: "Other highlights on this page (2)",
	});
	await expect(
		expandHighlights.or(dialog.getByText(SECOND_QUOTE)).first(),
	).toBeVisible();
	if (await expandHighlights.isVisible()) await expandHighlights.click();
	await expect(dialog.getByText(SECOND_QUOTE)).toBeVisible();
	await expect(dialog.getByText(THIRD_QUOTE)).toBeVisible();
});
