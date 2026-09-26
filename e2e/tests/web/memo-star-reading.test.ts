import type { Locator, Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 토글할 메모. 나머지 메모는 목록이 이 메모만 걸러내는지 보려고 함께 넣는다. */
const TARGET_MEMO_TITLE = "별과 책 토글 대상 메모";

/** 메모 카드의 세 토글 버튼 이름(en). 상태와 무관하게 고정이다. */
const TOGGLE_NAMES = ["Wishlist", "Reading", "Important"];

/** 제목으로 메모 카드를 집는다. */
const getMemoCard = (page: Page, title: string) =>
	page.locator(".memo-item", { hasText: title });

/** 카드의 토글 버튼 이름을 화면 순서대로 읽는다. 푸터의 aria-pressed 버튼이 세 토글이다. */
const readToggleNames = async (memoCard: Locator) => {
	const toggleButtons = memoCard.locator("button[aria-pressed]");
	await expect(toggleButtons).toHaveCount(3);

	return toggleButtons.evaluateAll((buttons) =>
		buttons.map((button) => button.getAttribute("aria-label") ?? ""),
	);
};

test.describe("메모 카드의 중요·읽는 중 토글 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();

		store.addMemo(createMockMemo({ title: TARGET_MEMO_TITLE }));
		store.addMemo(createMockMemo({ title: "토글하지 않는 메모 A" }));
		store.addMemo(createMockMemo({ title: "토글하지 않는 메모 B" }));

		await setupSupabaseMocks(page, store);
	});

	test("중요 토글을 켜면 중요 목록에 나타나고, 끄면 사라진다. 이름은 그대로고 aria-pressed만 바뀐다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		const memoCard = getMemoCard(page, TARGET_MEMO_TITLE);
		const starToggle = memoCard.getByRole("button", {
			name: "Important",
			exact: true,
		});
		await expect(starToggle).toHaveAttribute("aria-pressed", "false");

		await starToggle.click();

		await expect(starToggle).toHaveAttribute("aria-pressed", "true");
		await expect(starToggle).toHaveAttribute("aria-label", "Important");

		await page.getByRole("link", { name: "Important", exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`${PATHS.memosStar}$`));
		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(memoCard).toBeVisible();

		await starToggle.click();

		await expect(memoCard).toBeHidden();
		await expect(page.locator(".memo-item")).toHaveCount(0);
	});

	test("읽는 중 토글을 켜면 읽는 중 목록에 나타난다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		const memoCard = getMemoCard(page, TARGET_MEMO_TITLE);
		const readingToggle = memoCard.getByRole("button", {
			name: "Reading",
			exact: true,
		});
		await expect(readingToggle).toHaveAttribute("aria-pressed", "false");

		await readingToggle.click();

		await expect(readingToggle).toHaveAttribute("aria-pressed", "true");
		await expect(readingToggle).toHaveAttribute("aria-label", "Reading");

		await page.getByRole("link", { name: "Reading", exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`${PATHS.memosReading}$`));
		await expect(page.locator(".memo-item")).toHaveCount(1);
		await expect(memoCard).toBeVisible();
	});

	test("세 토글의 이름은 로케일마다 번역되고, 서로 다르다.", async ({
		page,
	}) => {
		await gotoSafely({
			page,
			url: `ko${PATHS.memos}`,
			regexp: new RegExp(`/ko${PATHS.memos}`),
		});
		const koreanToggleNames = await readToggleNames(
			getMemoCard(page, TARGET_MEMO_TITLE),
		);

		await gotoSafely({
			page,
			url: `en${PATHS.memos}`,
			regexp: new RegExp(`/en${PATHS.memos}`),
		});
		const englishToggleNames = await readToggleNames(
			getMemoCard(page, TARGET_MEMO_TITLE),
		);

		expect(englishToggleNames).toEqual(TOGGLE_NAMES);
		expect(new Set(koreanToggleNames).size).toBe(3);
		koreanToggleNames.forEach((koreanToggleName, index) => {
			expect(koreanToggleName).toMatch(/[가-힣]/);
			expect(koreanToggleName).not.toBe(englishToggleNames[index]);
		});
	});
});
