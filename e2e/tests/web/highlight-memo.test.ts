import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockHighlight,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("하이라이트에서 실제 메모 연결", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
	});

	test("URL 카드 그리드에서 문장에 메모를 저장하고 상세에서 인용을 본다", async ({
		page,
	}) => {
		const first = store.addHighlight(
			createMockHighlight({
				url: "https://example.com/one",
				exact_text: "First saved sentence",
				note: "Old comment",
			}),
		);
		store.addHighlight(
			createMockHighlight({
				url: "https://example.com/two",
				exact_text: "Second saved sentence",
			}),
		);
		store.addHighlight(
			createMockHighlight({
				url: "https://example.com/three",
				exact_text: "Third saved sentence",
			}),
		);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		const cards = page.locator("main article");
		await expect(cards).toHaveCount(3);
		await expect(cards.first()).toHaveCSS("width", "300px");
		const quote = page.locator(`#highlight-${first.id}`);
		await expect(
			quote.getByRole("button", { name: "Old comment" }),
		).toBeVisible();
		await quote.getByRole("button", { name: "+ Add memo" }).click();
		const input = quote.getByRole("textbox", {
			name: "Write what this passage made you think",
		});
		await expect(
			quote.getByRole("button", { name: "Save memo" }),
		).toBeDisabled();
		await input.fill("My own thought");
		await quote.getByRole("button", { name: "Save memo" }).click();
		await expect(page).toHaveURL(/\/memos\?id=\d+/);
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText("First saved sentence")).toBeVisible();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"My own thought",
		);
		await expect(
			dialog.getByRole("link", { name: "View linked highlight" }),
		).toHaveAttribute("href", new RegExp(`highlightId=${first.id}`));
	});

	test("저장 실패 시 초안이 남고 재시도로 하나의 메모만 만든다", async ({
		page,
	}) => {
		const highlight = store.addHighlight(
			createMockHighlight({ exact_text: "Retry quote" }),
		);
		let failOnce = true;
		await page.route(
			`${SUPABASE.url}/rest/v1/rpc/create_memo_from_highlight`,
			async (route) => {
				if (!failOnce) return route.fallback();
				failOnce = false;
				await route.fulfill({
					status: 503,
					contentType: "application/json",
					body: JSON.stringify({ message: "temporary failure" }),
				});
			},
		);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		const quote = page.locator(`#highlight-${highlight.id}`);
		await quote.getByRole("button", { name: "+ Add memo" }).click();
		const input = quote.getByRole("textbox", {
			name: "Write what this passage made you think",
		});
		await input.fill("Retained draft");
		await quote.getByRole("button", { name: "Save memo" }).click();
		await expect(quote.getByRole("alert")).toContainText(
			"Your draft is still here",
		);
		await expect(input).toHaveValue("Retained draft");
		await quote.getByRole("button", { name: "Cancel" }).click();
		await quote.getByRole("button", { name: "+ Add memo" }).click();
		await expect(input).toHaveValue("Retained draft");
		await quote.getByRole("button", { name: "Save memo" }).click();
		await expect(page).toHaveURL(/\/memos\?id=\d+/);
		expect(store.getAllMemos()).toHaveLength(1);
	});

	test("URL만 같은 다른 메모는 직접 연결로 표시하지 않고 ID 이동은 필터와 별개로 찾는다", async ({
		page,
	}) => {
		const highlight = store.addHighlight(
			createMockHighlight({
				url: "https://example.com/shared",
				exact_text: "Owned quote",
			}),
		);
		store.addMemo(
			createMockMemo({ url: highlight.url, memo: "Unrelated memo" }),
		);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}?highlightId=${highlight.id}`,
			regexp: new RegExp(PATHS.highlights),
		});
		await expect(page.locator(`#highlight-${highlight.id}`)).toBeFocused();
		await expect(
			page
				.locator(`#highlight-${highlight.id}`)
				.getByRole("button", { name: "+ Add memo" }),
		).toBeVisible();
		await page.getByRole("button", { name: "green" }).click();
		await expect(page.locator(`#highlight-${highlight.id}`)).toBeVisible();
	});
});
