import type { Page } from "@playwright/test";
import { getPageKey } from "@web-memo/shared/utils/url";
import { expect, test } from "../fixtures/extension";
import {
	findSidePanelPage,
	getMemoQueryPageKeys,
	login,
	openSidePanel,
	skipGuide,
	waitForSidePanelMemoQuery,
} from "../lib";
import {
	createMockSetting,
	MockSupabaseStore,
	mockSummaryApi,
	setupSupabaseMocks,
} from "../lib/mocks";

const SUMMARY_CHUNKS = ["E2E mock summary: ", "the key point of this page."];

test.describe("사이드 패널 - 페이지 요약", () => {
	let summaryApi: Awaited<ReturnType<typeof mockSummaryApi>>;

	test.beforeEach(async ({ page, context }) => {
		await context.route(
			/https:\/\/[^/]*(google-analytics\.com|analytics\.google\.com)\//,
			(route) => route.fulfill({ status: 204 }),
		);
		// 요약은 메모가 없어도 된다. 사이드 패널의 메모 조회가 실서버를 읽지 않도록 빈 목 저장소를 씌운다.
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting({ show_summary: false }));
		await setupSupabaseMocks(page, store);
		summaryApi = await mockSummaryApi({
			context,
			summaryChunks: SUMMARY_CHUNKS,
		});

		// 로그인 뒤의 메모 화면(localhost:3000)은 content script가 붙는 일반 웹 페이지다.
		// 사이드 패널은 이 탭에서 열리며 열릴 때 이 페이지의 본문을 읽어 둔다.
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test("요약 보기를 누르면 바로 요약 API를 한 번 부르고 결과를 보여준다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
		await openSummary(sidePanelPage);

		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		await expect(sidePanelPage.getByRole("tablist")).toHaveCount(0);
		const generateLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_generate_label",
		});
		await expect(
			sidePanelPage.getByRole("button", { name: generateLabel, exact: true }),
		).toHaveCount(0);
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});

	test("요약 열기와 접기는 GA 이벤트를 각각 한 번 기록하고 페이지 전환은 기록하지 않는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		const actions: Array<Promise<string | undefined>> = [];
		sidePanelPage.on("console", (message) => {
			if (!message.text().startsWith("[analytics] summary_panel_toggle")) {
				return;
			}
			const parameters = message.args()[1];
			actions.push(
				parameters?.jsonValue().then((params) => {
					return (params as { action?: string }).action;
				}) ?? Promise.resolve(undefined),
			);
		});
		const hideLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_hide_label",
		});

		await openSummary(sidePanelPage);
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		await sidePanelPage
			.getByRole("button", { name: hideLabel, exact: true })
			.click();
		await openSummary(sidePanelPage);
		await expect
			.poll(async () => Promise.all(actions))
			.toEqual(["open", "close", "open"]);

		const previousPageKey = getPageKey(page.url());
		const nextMemoQuery = sidePanelPage.waitForResponse((response) => {
			const keys = getMemoQueryPageKeys(response.url());
			return keys !== null && !keys.includes(previousPageKey);
		});
		await page.goto("about:blank");
		await nextMemoQuery;
		expect(await Promise.all(actions)).toEqual(["open", "close", "open"]);
	});

	test("미지원 페이지에서는 눌렀을 때만 안내가 보이고 메모는 남는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		const unavailableMessage = await getExtensionMessage({
			sidePanelPage,
			key: "summary_unavailable_message",
		});
		const showLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_show_label",
		});

		// about:blank에는 content script가 붙지 않는다(매니페스트의 매치 패턴이 about: 스킴을 덮지 않는다).
		// 사이드 패널은 탭이 바뀌면 탭 정보와 페이지 본문을 함께 다시 읽는다. 새 탭 URL로 메모를 조회할 때까지
		// 기다려야 이전 페이지 본문이 남은 채로 요약 버튼을 누르지 않는다. 메모 조회는 페이지 키로 보내므로
		// (about:blank는 페이지 키가 URL 꼴이 아니다) 새 키를 맞추지 않고 "이전 페이지가 아닌 조회"를 기다린다.
		const previousPageKey = getPageKey(page.url());
		const nextPageMemoQuery = sidePanelPage.waitForResponse((response) => {
			const memoQueryPageKeys = getMemoQueryPageKeys(response.url());

			return (
				memoQueryPageKeys !== null &&
				!memoQueryPageKeys.includes(previousPageKey) &&
				response.ok()
			);
		});
		await page.goto("about:blank");
		await nextPageMemoQuery;

		const showButton = sidePanelPage.getByRole("button", {
			name: showLabel,
			exact: true,
		});
		await expect(showButton).toBeEnabled();
		await expect(
			sidePanelPage.getByText(unavailableMessage, { exact: true }),
		).toHaveCount(0);
		await showButton.click();
		await expect(
			sidePanelPage.getByText(unavailableMessage, { exact: true }),
		).toBeVisible();
		await expect(sidePanelPage.locator("#memo-textarea")).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
	});

	test("요약을 접고 같은 페이지에서 다시 열면 결과와 메모 초안이 유지되고 재요청하지 않는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		const hideLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_hide_label",
		});
		const memo = sidePanelPage.locator("#memo-textarea");
		await memo.fill("Unfinished memo draft");
		await openSummary(sidePanelPage);
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		await sidePanelPage
			.getByRole("button", { name: hideLabel, exact: true })
			.click();
		await openSummary(sidePanelPage);
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		await expect(memo).toHaveValue("Unfinished memo draft");
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});

	test("페이지가 바뀌면 기존 요약이 접히고 새 페이지에서 다시 누를 때만 실행된다", async ({
		page,
		context,
	}) => {
		await context.route("https://example.com/**", (route) =>
			route.fulfill({
				contentType: "text/html",
				body: "<h1>Another page</h1><p>Content for a new summary.</p>",
			}),
		);
		const sidePanelPage = await findSidePanelPage(page);
		const showLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_show_label",
		});
		await openSummary(sidePanelPage);
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		const nextUrl = "https://example.com/summary-next-page";
		const nextMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: nextUrl,
		});
		await page.goto(nextUrl);
		await nextMemoQuery;
		await expect(
			sidePanelPage.getByRole("button", { name: showLabel, exact: true }),
		).toHaveAttribute("aria-expanded", "false");
		await expect(sidePanelPage.getByText(SUMMARY_CHUNKS.join(""))).toHaveCount(
			0,
		);
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
		await openSummary(sidePanelPage);
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(2);
	});

	test("요약 요청 실패 후 명시적으로 재시도할 때만 다시 요청한다", async ({
		page,
		context,
	}) => {
		let requestCount = 0;
		await context.route("**/api/openai", async (route) => {
			requestCount += 1;
			if (requestCount === 1) {
				await route.fulfill({ status: 500, body: "Summary failed" });
				return;
			}
			await route.fallback();
		});
		const sidePanelPage = await findSidePanelPage(page);
		const retryLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_retry_label",
		});
		await openSummary(sidePanelPage);
		const retryButton = sidePanelPage.getByRole("button", {
			name: retryLabel,
			exact: true,
		});
		await expect(retryButton).toBeVisible();
		expect(requestCount).toBe(1);
		await retryButton.click();
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		expect(requestCount).toBe(2);
	});

	test("생성 요청 중에는 재실행할 수 없어 중복 요청하지 않는다", async ({
		page,
		context,
	}) => {
		let releaseResponse: () => void = () => {};
		const responseGate = new Promise<void>((resolve) => {
			releaseResponse = resolve;
		});
		let requestCount = 0;
		await context.route("**/api/openai", async (route) => {
			requestCount += 1;
			await responseGate;
			await route.fallback();
		});
		const sidePanelPage = await findSidePanelPage(page);
		const hideLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_hide_label",
		});
		const loadingMessage = await getExtensionMessage({
			sidePanelPage,
			key: "summary_loading_message",
		});
		await openSummary(sidePanelPage);
		try {
			await expect.poll(() => requestCount).toBe(1);
			await expect(
				sidePanelPage.getByText(loadingMessage, { exact: true }),
			).toBeVisible();
			await sidePanelPage
				.getByRole("button", { name: hideLabel, exact: true })
				.click();
			await openSummary(sidePanelPage);
			await expect(
				sidePanelPage.getByText(loadingMessage, { exact: true }),
			).toBeVisible();
			expect(requestCount).toBe(1);
		} finally {
			releaseResponse();
		}
		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});
});

const openSummary = async (sidePanelPage: Page) => {
	const showLabel = await getExtensionMessage({
		sidePanelPage,
		key: "summary_show_label",
	});
	await sidePanelPage
		.getByRole("button", { name: showLabel, exact: true })
		.click();
};

/**
 * 확장이 지금 UI 언어로 쓰는 번역 문구를 읽는다.
 * @description 확장 문구는 브라우저 UI 언어를 따르므로 테스트가 언어를 가정하지 않고 확장에게 직접 묻는다.
 * @throws 키가 `_locales`에 없어 빈 문자열이 나오면 던진다.
 */
const getExtensionMessage = async ({
	sidePanelPage,
	key,
}: IFGetExtensionMessageParams) => {
	const message = await sidePanelPage.evaluate(
		(messageKey) => chrome.i18n.getMessage(messageKey),
		key,
	);

	if (!message) {
		throw new Error(`확장 번역 문구가 없습니다: ${key}`);
	}

	return message;
};

/** {@link getExtensionMessage}의 인자. */
interface IFGetExtensionMessageParams {
	/** 확장의 사이드 패널 페이지 ({@link findSidePanelPage}) */
	sidePanelPage: Page;
	/** `_locales/<언어>/messages.json`의 키 */
	key: string;
}
