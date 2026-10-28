import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const DUPLICATE_TITLE = "Previously saved article";
const DUPLICATE_URL = "https://example.com/articles/previously-saved";
const DUPLICATE_MEMO_BODY = "Saved duplicate body";
const RELATED_TITLE = "Related saved article";
const RELATED_URL = "https://example.com/articles/related";
const SECOND_RELATED_TITLE = "Another related article";
const THIRD_RELATED_TITLE = "A third related article";

test("현재 글의 과거 메모를 알려 주고 사이드 패널에서 읽기 전용으로 연다", async ({
	page,
	context,
}) => {
	const { sidePanelPage, events, sentEvents } = await setupPastMemoPage({
		page,
		context,
	});
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: DUPLICATE_TITLE,
	});

	await expect(notice).toBeVisible();
	await expect(notice.getByText(DUPLICATE_TITLE)).toBeVisible();
	await expect(notice.getByText(messages.relatedIntro)).toBeVisible();
	await expect(
		notice.getByRole("button", { name: `${RELATED_TITLE} ${messages.open}` }),
	).toBeVisible();
	await expect(
		notice.getByRole("button", { name: SECOND_RELATED_TITLE }),
	).toBeHidden();
	await notice.getByRole("button", { name: messages.relatedMore }).click();
	await expect(
		notice.getByRole("button", { name: SECOND_RELATED_TITLE }),
	).toBeVisible();
	await expect(
		notice.getByRole("button", { name: THIRD_RELATED_TITLE }),
	).toBeVisible();

	await notice.getByRole("button", { name: messages.openMemo }).click();
	await expect(sidePanelPage.getByText(messages.viewReadonly)).toBeVisible();
	await expect(sidePanelPage.getByText(DUPLICATE_MEMO_BODY)).toBeVisible();
	await expect(sidePanelPage.locator("#memo-textarea")).toBeHidden();
	await expect
		.poll(async () => (await Promise.all(events)).map((event) => event.name))
		.toEqual(["past_memo_view_start", "past_memo_view_result"]);
	expect((await Promise.all(events))[1].params).toMatchObject({
		source: "rule",
		is_success: true,
		reason: "displayed",
		action: "existing",
	});

	await sidePanelPage.getByRole("button", { name: messages.viewBack }).click();
	await expect(sidePanelPage.getByText(messages.viewReadonly)).toBeHidden();
	await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
	await notice.getByRole("button", { name: messages.openMemo }).click();
	await expect
		.poll(async () => (await Promise.all(events)).map((event) => event.name))
		.toEqual([
			"past_memo_view_start",
			"past_memo_view_result",
			"past_memo_view_start",
			"past_memo_view_result",
		]);
	const loggedEvents = await Promise.all(events);
	if (loggedEvents[0].params.build_env === "development")
		expect(sentEvents).toHaveLength(0);
	else
		await expect
			.poll(() => sentEvents.map((event) => event.name).sort())
			.toEqual(loggedEvents.map((event) => event.name).sort());
	for (const event of loggedEvents) {
		const allowed = [
			"source",
			"is_success",
			"reason",
			"action",
			"event_category",
			"engagement_time_msec",
			"build_env",
			"extension_version",
			"debug_mode",
		];
		expect(
			Object.keys(event.params).every((key) => allowed.includes(key)),
		).toBe(true);
	}
});

test("기존 기록 표시 후 원문 탭이 열리면 reuse를 한 번 기록한다", async ({
	page,
	context,
}) => {
	const { sidePanelPage, events } = await setupPastMemoPage({ page, context });
	const messages = await getPastMemoMessages(sidePanelPage);
	await sidePanelPage.getByRole("button", { name: messages.openMemo }).click();
	await expect(sidePanelPage.getByText(DUPLICATE_MEMO_BODY)).toBeVisible();
	const opened = context.waitForEvent("page");
	await sidePanelPage
		.getByRole("button", { name: messages.viewOriginal })
		.click();
	await expect(await opened).toHaveURL(DUPLICATE_URL);
	await expect
		.poll(
			async () =>
				(await Promise.all(events)).filter(
					(event) => event.name === "past_memo_reuse",
				).length,
		)
		.toBe(1);
	expect(
		(await Promise.all(events)).find(
			(event) => event.name === "past_memo_reuse",
		)?.params,
	).toMatchObject({ source: "rule", action: "source_open" });
});

for (const scenario of [
	"empty_content",
	"not_found",
	"query_error",
	"cancelled",
] as const) {
	test(`과거 메모 ${scenario} 결과를 한 번 기록한다`, async ({
		page,
		context,
	}) => {
		const { sidePanelPage, events, store } = await setupPastMemoPage({
			page,
			context,
		});
		if (scenario === "empty_content")
			store.updateMemo(101, { memo: " ", impression: null, actionItem: null });
		if (scenario === "not_found") store.deleteMemo(101);
		let release: (() => void) | undefined;
		const blocked = new Promise<void>((resolve) => {
			release = resolve;
		});
		if (scenario === "query_error" || scenario === "cancelled") {
			await context.route("**/rest/v1/memo?**", async (route) => {
				if (
					new URL(route.request().url()).searchParams.get("id") !== "eq.101"
				) {
					await route.fallback();
					return;
				}
				if (scenario === "cancelled") {
					await blocked;
					await route.fulfill({ json: [store.getMemo(101)] });
				} else
					await route.fulfill({
						status: 500,
						json: { message: "mock query failed" },
					});
			});
		}
		const messages = await getPastMemoMessages(sidePanelPage);
		await sidePanelPage
			.getByRole("button", { name: messages.openMemo })
			.click();
		if (scenario === "cancelled") {
			await sidePanelPage
				.getByRole("button", { name: messages.viewBack })
				.click();
			release?.();
			await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		}
		// 기본 쿼리 재시도 대기(1+2+4초)와 요청 시간을 포함해 최종 결과를 기다린다.
		await expect
			.poll(
				async () =>
					(await Promise.all(events)).filter(
						(event) => event.name === "past_memo_view_result",
					),
				{ timeout: 15_000 },
			)
			.toHaveLength(1);
		expect(
			(await Promise.all(events)).find(
				(event) => event.name === "past_memo_view_result",
			)?.params,
		).toMatchObject({
			is_success: false,
			reason: scenario,
			action: scenario === "empty_content" ? "existing" : "unknown",
		});
	});
}

// 새 탭이 열리면 사이드 패널이 그 탭을 따라가 배너가 사라진다.
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

	const relatedPagePromise = context.waitForEvent("page");
	await notice
		.getByRole("button", { name: `${RELATED_TITLE} ${messages.open}` })
		.click();
	const relatedPage = await relatedPagePromise;
	await expect(relatedPage).toHaveURL(RELATED_URL);
});

test("웹사이트로 이동을 누르면 원래 URL을 새 탭으로 연다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupPastMemoPage({ page, context });
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: DUPLICATE_TITLE,
	});

	await expect(notice).toBeVisible();

	const duplicatePagePromise = context.waitForEvent("page");
	await notice.getByRole("button", { name: messages.openSite }).click();
	const duplicatePage = await duplicatePagePromise;
	await expect(duplicatePage).toHaveURL(DUPLICATE_URL);
});

test("같은 글이 없어도 첫 관련 메모를 바로 열 수 있다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupPastMemoPage({
		page,
		context,
		includeDuplicate: false,
	});
	const messages = await getPastMemoMessages(sidePanelPage);
	const notice = sidePanelPage.getByRole("status").filter({
		hasText: RELATED_TITLE,
	});

	await expect(notice.getByText(messages.relatedIntro)).toBeVisible();
	await expect(
		notice.getByRole("button", { name: `${RELATED_TITLE} ${messages.open}` }),
	).toBeVisible();
	await expect(
		notice.getByRole("button", { name: SECOND_RELATED_TITLE }),
	).toBeHidden();
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

const setupPastMemoPage = async ({
	page,
	context,
	includeDuplicate = true,
}: IFPastMemoPageParams) => {
	const sentEvents: Array<{ name: string; params: Record<string, unknown> }> =
		[];
	await context.route(
		/https:\/\/[^/]*(google-analytics\.com|analytics\.google\.com)\//,
		async (route) => {
			const body = route.request().postData();
			if (body && route.request().url().includes("/mp/collect")) {
				const payload = JSON.parse(body) as {
					events?: Array<{ name: string; params: Record<string, unknown> }>;
				};
				sentEvents.push(
					...(payload.events ?? []).filter((event) =>
						[
							"past_memo_view_start",
							"past_memo_view_result",
							"past_memo_reuse",
						].includes(event.name),
					),
				);
			}
			await route.fulfill({ status: 204 });
		},
	);
	const store = new MockSupabaseStore();
	store.addMemo(
		createMockMemo({
			id: 101,
			title: DUPLICATE_TITLE,
			url: DUPLICATE_URL,
			memo: DUPLICATE_MEMO_BODY,
			created_at: "2020-01-01T00:00:00Z",
		}),
	);
	await setupSupabaseMocks(page, store);

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
				duplicate: includeDuplicate
					? {
							id: 101,
							title: DUPLICATE_TITLE,
							url: DUPLICATE_URL,
							source: "rule",
						}
					: null,
				related: [
					{
						id: 102,
						title: RELATED_TITLE,
						url: RELATED_URL,
						favIconUrl: null,
						updatedAt: null,
					},
					{
						id: 103,
						title: SECOND_RELATED_TITLE,
						url: "https://example.com/articles/another-related",
						favIconUrl: null,
						updatedAt: null,
					},
					{
						id: 104,
						title: THIRD_RELATED_TITLE,
						url: "https://example.com/articles/third-related",
						favIconUrl: null,
						updatedAt: null,
					},
				],
			},
		});
	});

	await login(page);
	const accessToken = (await context.cookies()).find(
		(cookie) => cookie.name === "access_token",
	)?.value;
	if (!accessToken) throw new Error("Missing test login token");
	const payload: unknown = JSON.parse(
		Buffer.from(accessToken.split(".")[1], "base64url").toString(),
	);
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("sub" in payload) ||
		typeof payload.sub !== "string"
	)
		throw new Error("Missing test login user");
	store.updateMemo(101, { user_id: payload.sub });
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	const events: Array<
		Promise<{ name: string; params: Record<string, unknown> }>
	> = [];
	sidePanelPage.on("console", (message) => {
		const name = message.text().split(" ")[1];
		if (
			![
				"past_memo_view_start",
				"past_memo_view_result",
				"past_memo_reuse",
			].includes(name)
		)
			return;
		events.push(
			message
				.args()[1]
				.jsonValue()
				.then((params) => ({ name, params })),
		);
	});

	return {
		events,
		sentEvents,
		store,
		sidePanelPage,
		getRequestedPageUrls: () => requestedPageUrls,
	};
};

const getPastMemoMessages = async (sidePanelPage: Page) =>
	sidePanelPage.evaluate(() => ({
		open: chrome.i18n.getMessage("past_memo_open"),
		openMemo: chrome.i18n.getMessage("past_memo_open_memo"),
		openSite: chrome.i18n.getMessage("past_memo_open_site"),
		dismiss: chrome.i18n.getMessage("past_memo_dismiss"),
		relatedIntro: chrome.i18n.getMessage("past_memo_related_intro"),
		viewBack: chrome.i18n.getMessage("past_memo_view_back"),
		viewOriginal: chrome.i18n.getMessage("past_memo_view_open_original"),
		viewReadonly: chrome.i18n.getMessage("past_memo_view_readonly"),
		relatedMore: chrome.i18n.getMessage("past_memo_related_more", "2"),
	}));

/** 과거 메모 알림을 목 응답으로 여는 데 필요한 브라우저 페이지와 컨텍스트. */
interface IFPastMemoPageParams {
	page: Page;
	context: BrowserContext;
	includeDuplicate?: boolean;
}
