import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const DUPLICATE_TITLE = "Previously saved article";
const DUPLICATE_URL = "https://example.com/articles/previously-saved";
const RELATED_TITLE = "Related saved article";
const RELATED_URL = "https://example.com/articles/related";

test("현재 글의 과거 메모를 알려 주고 기존 글을 연다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupPastMemoPage({ page, context });
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: DUPLICATE_TITLE,
	});

	await expect(notice).toBeVisible();
	await expect(notice.getByText(DUPLICATE_TITLE)).toBeVisible();
	await expect(notice.getByText(messages.related)).toBeVisible();
	await notice.getByText(messages.related).click();
	await expect(
		notice.getByRole("button", { name: RELATED_TITLE }),
	).toBeVisible();

	const openedPagePromise = context.waitForEvent("page");
	await notice.getByRole("button", { name: messages.open }).click();
	const openedPage = await openedPagePromise;
	await expect(openedPage).toHaveURL(DUPLICATE_URL);
});

// 새 탭이 열리면 사이드 패널이 그 탭을 따라가 배너가 사라지므로, 같은 글 열기와 따로 확인한다.
test("관련 메모를 누르면 웹 메모 상세가 아니라 원래 사이트를 새 탭으로 연다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupPastMemoPage({ page, context });
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: DUPLICATE_TITLE,
	});

	await expect(notice).toBeVisible();
	await notice.getByText(messages.related).click();

	const relatedPagePromise = context.waitForEvent("page");
	await notice.getByRole("button", { name: RELATED_TITLE }).click();
	const relatedPage = await relatedPagePromise;
	await expect(relatedPage).toHaveURL(RELATED_URL);
});

test("과거 메모 알림을 닫으면 같은 글에서 다시 표시하지 않는다", async ({
	page,
	context,
}) => {
	const { sidePanelPage, getRequestedPageUrls } = await setupPastMemoPage({
		page,
		context,
	});
	const originalUrl = page.url();
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: DUPLICATE_TITLE,
	});

	await expect(notice).toBeVisible();
	await notice.getByRole("button", { name: messages.dismiss }).click();
	await expect(notice).toBeHidden();
	await expect
		.poll(() =>
			sidePanelPage.evaluate(async () => {
				const storage = await chrome.storage.local.get("pastMemoDismissedUrls");
				return storage.pastMemoDismissedUrls;
			}),
		)
		.toContain(originalUrl);

	await sidePanelPage.reload();
	await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();

	// 다른 URL에서 알림이 다시 보이면 새 패널이 무시 목록과 탭 상태를 모두 읽은 상태다.
	const alternateUrl = new URL(originalUrl);
	alternateUrl.searchParams.set("e2ePastMemo", "alternate");
	await page.goto(alternateUrl.toString());
	await expect(notice).toBeVisible();

	await page.goto(originalUrl);
	await expect(notice).toBeHidden();
	expect(
		getRequestedPageUrls().filter((url) => url === originalUrl),
	).toHaveLength(1);
});

const setupPastMemoPage = async ({ page, context }: IFPastMemoPageParams) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());

	const requestedPageUrls: string[] = [];
	await context.route("**/api/past-memo", async (route) => {
		const requestBody: unknown = route.request().postDataJSON();
		if (
			typeof requestBody === "object" &&
			requestBody !== null &&
			"pageUrl" in requestBody &&
			typeof requestBody.pageUrl === "string"
		) {
			requestedPageUrls.push(requestBody.pageUrl);
		}
		await route.fulfill({
			json: {
				duplicate: {
					id: 101,
					title: DUPLICATE_TITLE,
					url: DUPLICATE_URL,
					source: "rule",
				},
				related: [
					{
						id: 102,
						title: RELATED_TITLE,
						url: RELATED_URL,
						favIconUrl: null,
						updatedAt: null,
					},
				],
			},
		});
	});

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);

	return {
		sidePanelPage,
		getRequestedPageUrls: () => requestedPageUrls,
	};
};

const getPastMemoMessages = async (sidePanelPage: Page) =>
	sidePanelPage.evaluate(() => ({
		open: chrome.i18n.getMessage("past_memo_open"),
		dismiss: chrome.i18n.getMessage("past_memo_dismiss"),
		related: chrome.i18n.getMessage("past_memo_related", "1"),
	}));

/** 과거 메모 알림을 목 응답으로 여는 데 필요한 브라우저 페이지와 컨텍스트. */
interface IFPastMemoPageParams {
	page: Page;
	context: BrowserContext;
}
