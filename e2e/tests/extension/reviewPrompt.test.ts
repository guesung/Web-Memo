import type { ConsoleMessage, Page } from "@playwright/test";
import { EXTERNAL_LINK, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const TARGET_URL = "https://example.com/review-prompt";
const REVIEW_PROMPT_KEY = "reviewPrompt";
const NEVER_SHOW_PATTERN = /Don't show again|다시 보지 않기/;
const OPEN_REVIEW_PATTERN = /Review on Chrome Web Store|웹스토어에서 리뷰 쓰기/;
const CLOSE_PATTERN = /^(Close|닫기)$/;

interface IFStoredReviewPrompt {
	shownCount: number;
	lastShownAt: number | null;
	dismissedForever: boolean;
}

/**
 * 사이드 패널을 열고, 대상 페이지에 이미 있는 메모 수와 저장된 리뷰 요청 상태를 준비한다.
 * @description 저장하는 메모 자체도 개수에 들어간다. 저장 전 메모가 `existingMemoCount`개면 저장 후 개수는 +1이다.
 */
const prepareSidePanel = async ({
	page,
	existingMemoCount,
	storedReviewPrompt,
}: {
	page: Page;
	existingMemoCount: number;
	storedReviewPrompt?: IFStoredReviewPrompt;
}) => {
	const context = page.context();
	const store = new MockSupabaseStore();
	for (let index = 0; index < existingMemoCount; index += 1) {
		store.addMemo(createMockMemo());
	}
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: "<h1>Review fixture</h1>",
		}),
	);
	await context.route("https://chromewebstore.google.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<h1>Reviews</h1>" }),
	);

	let memoCountRequestCount = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() === "HEAD") {
			memoCountRequestCount += 1;
		}
		await route.fallback();
	});

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	if (storedReviewPrompt) {
		await panel.evaluate(
			([key, value]) => chrome.storage.sync.set({ [key]: value }),
			[REVIEW_PROMPT_KEY, storedReviewPrompt] as const,
		);
	}
	await page.goto(TARGET_URL);
	await expect(panel.locator("#memo-textarea")).toBeEditable();

	return {
		panel,
		banner: panel.getByTestId("review-prompt-banner"),
		getMemoCountRequestCount: () => memoCountRequestCount,
	};
};

const saveMemo = async (panel: Page) => {
	const saveResponse = panel.waitForResponse(
		(response) =>
			response.url().includes("/rest/v1/memo") &&
			response.request().method() !== "GET" &&
			response.ok(),
	);
	await panel.locator("#memo-textarea").fill("리뷰 요청 테스트 메모");
	await saveResponse;
};

const readStoredReviewPrompt = (panel: Page) =>
	panel.evaluate(async (key) => {
		const stored = await chrome.storage.sync.get(key);

		return stored[key] as IFStoredReviewPrompt | undefined;
	}, REVIEW_PROMPT_KEY);

/** 배너가 뜬 상태(메모 5개 이상)를 만든다. */
const showBanner = async (page: Page) => {
	const sidePanel = await prepareSidePanel({ page, existingMemoCount: 4 });
	await saveMemo(sidePanel.panel);
	await expect(sidePanel.banner).toBeVisible();

	return sidePanel;
};

test("메모가 5개가 되는 저장 직후 배너가 뜨고 노출 횟수가 기록된다", async ({
	page,
}) => {
	const { panel, banner } = await prepareSidePanel({
		page,
		existingMemoCount: 4,
	});

	await saveMemo(panel);

	await expect(banner).toBeVisible();
	await expect
		.poll(async () => (await readStoredReviewPrompt(panel))?.shownCount)
		.toBe(1);
	const stored = await readStoredReviewPrompt(panel);
	expect(stored?.lastShownAt).not.toBeNull();
	expect(stored?.dismissedForever).toBe(false);
});

test("메모가 5개 미만이면 배너가 뜨지 않는다", async ({ page }) => {
	const { panel, banner, getMemoCountRequestCount } = await prepareSidePanel({
		page,
		existingMemoCount: 3,
	});

	await saveMemo(panel);

	await expect.poll(getMemoCountRequestCount).toBe(1);
	await expect(banner).toHaveCount(0);
	expect(await readStoredReviewPrompt(panel)).toBeUndefined();
});

test("다시 보지 않기를 고른 적이 있으면 개수를 조회하지 않고 배너도 없다", async ({
	page,
}) => {
	const { panel, banner, getMemoCountRequestCount } = await prepareSidePanel({
		page,
		existingMemoCount: 9,
		storedReviewPrompt: {
			shownCount: 1,
			lastShownAt: 1,
			dismissedForever: true,
		},
	});

	await saveMemo(panel);
	await panel.waitForTimeout(500);

	await expect(banner).toHaveCount(0);
	expect(getMemoCountRequestCount()).toBe(0);
});

test("웹스토어에서 리뷰 쓰기를 누르면 리뷰 페이지가 새 탭으로 열리고 다시 뜨지 않게 저장된다", async ({
	page,
}) => {
	const { panel, banner } = await showBanner(page);

	const reviewTabPromise = page.context().waitForEvent("page");
	await banner.getByRole("button", { name: OPEN_REVIEW_PATTERN }).click();
	const reviewTab = await reviewTabPromise;

	await expect(banner).toHaveCount(0);
	await expect
		.poll(() => reviewTab.url())
		.toBe(EXTERNAL_LINK.chromeWebStoreReviews);
	await expect
		.poll(async () => (await readStoredReviewPrompt(panel))?.dismissedForever)
		.toBe(true);
});

test("닫기를 누르면 배너만 사라지고 저장소는 그대로다", async ({ page }) => {
	const { panel, banner } = await showBanner(page);
	await expect
		.poll(async () => (await readStoredReviewPrompt(panel))?.shownCount)
		.toBe(1);
	const before = await readStoredReviewPrompt(panel);

	await banner.getByRole("button", { name: CLOSE_PATTERN }).click();

	await expect(banner).toHaveCount(0);
	expect(await readStoredReviewPrompt(panel)).toEqual(before);
});

test("배너 안에 포커스가 있을 때 Esc를 누르면 닫힌다", async ({ page }) => {
	const { panel, banner } = await showBanner(page);

	await banner.getByRole("button", { name: CLOSE_PATTERN }).focus();
	await panel.keyboard.press("Escape");

	await expect(banner).toHaveCount(0);
});

test("다시 보지 않기를 누르면 새 탭 없이 배너가 사라지고 다시 뜨지 않게 저장된다", async ({
	page,
}) => {
	const { panel, banner } = await showBanner(page);
	const pageCountBefore = page.context().pages().length;

	await banner.getByRole("button", { name: NEVER_SHOW_PATTERN }).click();

	await expect(banner).toHaveCount(0);
	await expect
		.poll(async () => (await readStoredReviewPrompt(panel))?.dismissedForever)
		.toBe(true);
	expect(page.context().pages()).toHaveLength(pageCountBefore);
});

test("오프라인 대기열에 저장될 때는 배너가 뜨지 않는다", async ({ page }) => {
	const { panel, banner, getMemoCountRequestCount } = await prepareSidePanel({
		page,
		existingMemoCount: 9,
	});

	await page.context().setOffline(true);
	await panel.locator("#memo-textarea").fill("오프라인 메모");
	await expect(
		panel.getByText(/saved on this device|이 기기에 저장됨/i).first(),
	).toBeVisible();
	await panel.waitForTimeout(500);

	await expect(banner).toHaveCount(0);
	expect(getMemoCountRequestCount()).toBe(0);
});

test("배너 노출과 리뷰 쓰기 클릭이 shown_count와 함께 기록된다", async ({
	page,
	context,
}) => {
	const events: { name: string; params: Record<string, unknown> }[] = [];
	const captureAnalytics = async (message: ConsoleMessage) => {
		const name = message
			.text()
			.match(/^\[analytics\] (review_prompt_view|review_prompt_open)\b/)?.[1];
		if (!name) return;
		const params = await message.args()[1]?.jsonValue();
		events.push({ name, params });
	};
	const watchPage = (target: Page) =>
		target.on("console", (message) => void captureAnalytics(message));
	context.pages().forEach(watchPage);
	context.on("page", watchPage);
	// 개발 빌드는 콘솔만 사용한다. 환경 설정이 달라도 테스트 이벤트가 GA로 전송되지 않게 막는다.
	await context.route(/https:\/\/[^/]*google-analytics\.com\//, (route) =>
		route.fulfill({ status: 204 }),
	);
	const { banner } = await showBanner(page);

	await expect
		.poll(() => events.filter((event) => event.name === "review_prompt_view"))
		.toEqual([{ name: "review_prompt_view", params: { shown_count: 1 } }]);

	const reviewTabPromise = context.waitForEvent("page");
	await banner.getByRole("button", { name: OPEN_REVIEW_PATTERN }).click();
	await reviewTabPromise;

	await expect
		.poll(() => events.filter((event) => event.name === "review_prompt_open"))
		.toEqual([{ name: "review_prompt_open", params: { shown_count: 1 } }]);
});
