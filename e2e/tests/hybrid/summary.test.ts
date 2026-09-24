import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	MockSupabaseStore,
	mockSummaryApi,
	setupSupabaseMocks,
} from "../lib/mocks";

const SUMMARY_CHUNKS = ["E2E mock summary: ", "the key point of this page."];

test.describe("사이드 패널 - 페이지 요약", () => {
	let summaryApi: Awaited<ReturnType<typeof mockSummaryApi>>;

	test.beforeEach(async ({ page, context }) => {
		// 요약은 메모가 없어도 된다. 사이드 패널의 메모 조회가 실서버를 읽지 않도록 빈 목 저장소를 씌운다.
		await setupSupabaseMocks(page, new MockSupabaseStore());
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

	test("content script가 있는 페이지에서 요약 생성 버튼을 누르면, 요약 API를 한 번 부르고 받은 요약을 보여준다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		const summaryGenerateLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_generate_label",
		});

		await sidePanelPage
			.getByRole("button", { name: summaryGenerateLabel, exact: true })
			.click();

		await expect(
			sidePanelPage.getByText(SUMMARY_CHUNKS.join("")),
		).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(1);
	});

	test("content script가 없는 페이지에서 요약을 시도하면, 본문을 읽지 못했다는 안내를 보여주고 요약 API를 부르지 않는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);
		const summaryGenerateLabel = await getExtensionMessage({
			sidePanelPage,
			key: "summary_generate_label",
		});
		const pageContentErrorMessage = await getExtensionMessage({
			sidePanelPage,
			key: "error_get_page_content",
		});

		// about:blank에는 content script가 붙지 않는다(매니페스트의 매치 패턴이 about: 스킴을 덮지 않는다).
		// 사이드 패널은 탭이 바뀌면 탭 정보와 페이지 본문을 함께 다시 읽는다. 새 탭 URL로 메모를 조회할 때까지
		// 기다려야 이전 페이지 본문이 남은 채로 요약 버튼을 누르지 않는다. 메모 조회는 URL을 정규화해 보내므로
		// (about:blank는 정규화 결과가 URL 꼴이 아니다) 새 URL을 맞추지 않고 "이전 페이지가 아닌 조회"를 기다린다.
		const previousPageMemoFilter = `eq.${page.url()}`;
		const nextPageMemoQuery = sidePanelPage.waitForResponse((response) => {
			const memoUrlFilter = new URL(response.url()).searchParams.get("url");

			return (
				response.url().includes("/rest/v1/memo") &&
				memoUrlFilter !== null &&
				memoUrlFilter !== previousPageMemoFilter &&
				response.ok()
			);
		});
		await page.goto("about:blank");
		await nextPageMemoQuery;

		await sidePanelPage
			.getByRole("button", { name: summaryGenerateLabel, exact: true })
			.click();

		// 안내는 여러 줄이다. 첫 줄(본문을 읽지 못했다는 문장)로 확인한다.
		await expect(
			sidePanelPage.getByText(pageContentErrorMessage.split("\n")[0]),
		).toBeVisible();
		expect(summaryApi.getSummaryRequestCount()).toBe(0);
	});
});

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
