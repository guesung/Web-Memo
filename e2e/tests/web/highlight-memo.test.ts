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

test.describe("하이라이트에서 메모로 이동", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
	});

	test("URL별 한 열 목록에서 연결된 메모를 열면 보존된 인용을 본다", async ({
		page,
	}) => {
		const first = store.addHighlight(
			createMockHighlight({
				url: "https://example.com/one",
				exact_text: "First saved sentence",
				note: "Old comment",
			}),
		);
		const secondOnPage = store.addHighlight(
			createMockHighlight({
				url: first.url,
				exact_text: "Another sentence from the same page",
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
		const memo = store.addMemo(
			createMockMemo({ url: first.url, memo: "My own thought" }),
		);
		store.addHighlightMemoSource({
			memo_id: memo.id,
			highlight_id: first.id,
			user_id: first.user_id,
			exact_text: first.exact_text,
			url: first.url,
			prefix_text: first.prefix_text,
			suffix_text: first.suffix_text,
			text_position_start: first.text_position_start,
			color: first.color,
		});
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		const groups = page.locator("main article");
		await expect(groups).toHaveCount(3);
		const firstGroup = await groups.nth(0).boundingBox();
		const secondGroup = await groups.nth(1).boundingBox();
		expect(firstGroup?.width).toBeGreaterThan(600);
		expect(secondGroup?.y).toBeGreaterThan(
			(firstGroup?.y ?? 0) + (firstGroup?.height ?? 0),
		);
		const quote = page.locator(`#highlight-${first.id}`);
		const nextQuote = page.locator(`#highlight-${secondOnPage.id}`);
		await expect(quote).toHaveCSS("border-left-width", "3px");
		await expect(quote.locator("mark")).toHaveCSS("font-size", "16px");
		expect(
			(secondGroup?.y ?? 0) - (firstGroup?.y ?? 0) - (firstGroup?.height ?? 0),
		).toBeCloseTo(32, 1);
		const quoteBoxes = [
			await quote.boundingBox(),
			await nextQuote.boundingBox(),
		];
		const [upper, lower] = quoteBoxes.sort(
			(left, right) => (left?.y ?? 0) - (right?.y ?? 0),
		);
		expect(
			(lower?.y ?? 0) - (upper?.y ?? 0) - (upper?.height ?? 0),
		).toBeCloseTo(16, 1);
		await expect(quote.locator("mark")).toHaveCSS(
			"background-color",
			"rgba(0, 0, 0, 0)",
		);
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(quote.locator("mark")).toHaveCSS("font-size", "16px");
		const mobileQuoteBoxes = [
			await quote.boundingBox(),
			await nextQuote.boundingBox(),
		];
		const [mobileUpper, mobileLower] = mobileQuoteBoxes.sort(
			(left, right) => (left?.y ?? 0) - (right?.y ?? 0),
		);
		expect(
			(mobileLower?.y ?? 0) -
				(mobileUpper?.y ?? 0) -
				(mobileUpper?.height ?? 0),
		).toBeCloseTo(14, 1);
		await expect(
			quote.getByRole("button", { name: "Old comment" }),
		).toBeVisible();
		await quote.getByRole("link", { name: "Open memo" }).click();
		await expect(page).toHaveURL(new RegExp(`/memos\\?id=${memo.id}`));
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText("First saved sentence")).toBeVisible();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"My own thought",
		);
		await expect(
			dialog.getByRole("link", { name: "View linked highlight" }),
		).toHaveAttribute("href", new RegExp(`highlightId=${first.id}`));
	});

	test("URL 제목으로 원문을 열고 확장이 없으면 패널 안내를 표시한다", async ({
		page,
	}) => {
		const highlight = store.addHighlight(
			createMockHighlight({
				url: "https://example.com/article",
				exact_text: "Source quote",
			}),
		);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		const quote = page.locator(`#highlight-${highlight.id}`);
		await expect(
			quote.getByRole("link", { name: "Write in side panel" }),
		).toHaveCount(0);
		await expect(quote.getByRole("link", { name: "View source" })).toHaveCount(
			0,
		);
		const action = page.getByRole("link", {
			name: "Open source and memo panel",
		});
		await expect(action).toHaveAttribute("href", "https://example.com/article");
		const popupPromise = page.waitForEvent("popup");
		await action.click();
		await expect(
			page.getByText("Could not open the side panel. Check the extension."),
		).toHaveCount(0);
		const popup = await popupPromise;
		await expect(popup).toHaveURL(/https:\/\/example\.com\/article/);
		await popup.close();
		expect(store.getAllMemos()).toHaveLength(0);
	});

	test("스크롤 끝에서 같은 URL의 다음 페이지를 한 목록에 이어 붙인다", async ({
		page,
	}) => {
		const url = "https://example.com/long-article";
		for (let index = 0; index < 21; index++) {
			store.addHighlight(
				createMockHighlight({ url, exact_text: `Saved quote ${index + 1}` }),
			);
		}
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		await expect(page.locator("main article")).toHaveCount(1);
		await page.getByTestId("highlight-list-sentinel").scrollIntoViewIfNeeded();
		await expect(page.locator("main article li[id^='highlight-']")).toHaveCount(
			21,
		);
		await expect(page.locator("main article")).toHaveCount(1);
		await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(
			0,
		);
	});

	test("휴지통으로 보낸 연결 메모는 휴지통 보기 경로를 보여준다", async ({
		page,
	}) => {
		const highlight = store.addHighlight(createMockHighlight());
		const memo = store.addMemo(
			createMockMemo({
				url: highlight.url,
				memo: "Preserved thought",
				deleted_at: new Date().toISOString(),
			}),
		);
		store.addHighlightMemoSource({
			memo_id: memo.id,
			highlight_id: highlight.id,
			user_id: highlight.user_id,
			exact_text: highlight.exact_text,
			url: highlight.url,
			prefix_text: highlight.prefix_text,
			suffix_text: highlight.suffix_text,
			text_position_start: highlight.text_position_start,
			color: highlight.color,
		});
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});
		const quote = page.locator(`#highlight-${highlight.id}`);
		await expect(
			quote.getByRole("link", { name: "Linked memo is in trash · View trash" }),
		).toHaveAttribute("href", `/${LANGUAGE}${PATHS.memosTrash}`);
		await expect(
			quote.getByRole("link", { name: "Write in side panel" }),
		).toHaveCount(0);
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
				.getByRole("link", { name: "Write in side panel" }),
		).toHaveCount(0);
		await expect(
			page.getByRole("link", { name: "Open source and memo panel" }).first(),
		).toHaveAttribute("href", highlight.url);
		await page.getByRole("button", { name: "green" }).click();
		await expect(page.locator(`#highlight-${highlight.id}`)).toBeVisible();
	});
});
