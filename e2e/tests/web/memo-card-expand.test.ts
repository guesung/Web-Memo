import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/**
 * 목록 카드의 말줄임을 카드마다 펼치고, 펼쳐도 보던 자리가 밀리지 않는다.
 * egjs InfiniteGrid는 재배치 뒤 보이던 그룹의 중심을 유지하려고 스크롤을 직접 옮기므로,
 * 카드를 펼치거나 툴바 토글을 누른 뒤 scrollY가 그대로인지 본다.
 */
test.describe("메모 카드 펼치기 (Mocked)", () => {
	const LONG_MEMO = Array.from(
		{ length: 12 },
		(_, line) => `긴 본문 ${line + 1}번째 줄`,
	).join("\n");

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting({ truncate_memo_content: true }));
		for (let index = 0; index < 20; index++) {
			store.addMemo(
				createMockMemo({ title: `펼치기 메모 ${index}`, memo: LONG_MEMO }),
			);
		}

		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await expect(page.locator(".memo-item").first()).toBeVisible();
	});

	/** egjs의 재배치가 끝날 시간을 준 뒤 스크롤 위치를 읽는다. */
	const readScrollYAfterLayout = async (page: Page) => {
		await page.waitForTimeout(1000);

		return page.evaluate(() => window.scrollY);
	};

	test("맨 위에서 카드를 펼치면 전문이 보이고 스크롤은 그대로다.", async ({
		page,
	}) => {
		const firstMemo = page.locator(".memo-item").first();
		const expandButton = firstMemo.getByRole("button", { name: "Show more" });

		await expandButton.click();

		await expect(
			firstMemo.getByRole("button", { name: "Show less" }),
		).toHaveAttribute("aria-expanded", "true");
		await expect(firstMemo).toContainText("긴 본문 12번째 줄");
		await expect(firstMemo.locator(".line-clamp-3")).toHaveCount(0);
		expect(await readScrollYAfterLayout(page)).toBe(0);
		await expect(page).not.toHaveURL(/[?&]id=/);
	});

	test("스크롤한 상태에서 카드를 펼치고 접어도 보던 자리를 유지한다.", async ({
		page,
	}) => {
		await page.evaluate(() => window.scrollTo(0, 400));
		const startScrollY = await readScrollYAfterLayout(page);
		const visibleMemo = page.locator(".memo-item").nth(4);

		await visibleMemo.getByRole("button", { name: "Show more" }).click();
		expect(await readScrollYAfterLayout(page)).toBe(startScrollY);

		await visibleMemo.getByRole("button", { name: "Show less" }).click();
		expect(await readScrollYAfterLayout(page)).toBe(startScrollY);
	});

	test("툴바의 말줄임 토글을 꺼도 스크롤은 그대로다.", async ({ page }) => {
		await page.getByRole("button", { name: "Shorten memo content" }).click();

		await expect(
			page.getByRole("button", { name: "Shorten memo content" }),
		).toHaveAttribute("aria-pressed", "false");
		await expect(page.locator(".memo-item .line-clamp-3")).toHaveCount(0);
		expect(await readScrollYAfterLayout(page)).toBe(0);
	});
});
