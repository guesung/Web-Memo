import type { Page } from "@playwright/test";
import { errors, expect } from "@playwright/test";
import { getExtensionUrl } from "@web-memo/shared/constants";
import { getPageKey } from "@web-memo/shared/utils/url";

const SIDE_PANEL_URL = getExtensionUrl("side-panel/index.html");

/**
 * 사이드 패널 메모 칸에 입력하고 디바운스 저장이 끝날 때까지 기다린다.
 * @description 저장은 조회(GET) 뒤 생성(POST)이나 수정(PATCH)으로 나가므로 GET이 아닌 응답을 기다린다.
 * 응답 뒤에도 성공 처리(쿼리 데이터 갱신)가 이어지므로 "저장 중..." 표시가 사라질 때까지 기다린다.
 * @throws 저장 응답이 오지 않거나 실패하면 던진다.
 */
export async function fillMemo(page: Page, text: string) {
	const memoSaveResponse = page.waitForResponse(
		(response) =>
			response.url().includes("/rest/v1/memo") &&
			response.request().method() !== "GET",
	);

	await page.locator("#memo-textarea").fill(text);
	await expect(page.locator("#memo-textarea")).toHaveValue(text);

	const response = await memoSaveResponse;
	if (!response.ok()) {
		throw new Error(`메모 저장 실패: ${response.status()} ${response.url()}`);
	}

	await expect(page.getByText("저장 중...")).toBeHidden();
}

export async function openSidePanel(page: Page) {
	await page.locator("#OPEN_SIDE_PANEL_BUTTON").click();
}

/**
 * 확장이 연 사이드 패널 페이지를 찾아 메모 칸이 보일 때까지 기다린다.
 * @throws 제한 시간 안에 사이드 패널이 열리지 않거나 메모 칸이 보이지 않으면 던진다.
 */
export async function findSidePanelPage(page: Page, timeout = 10000) {
	const context = page.context();
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const sidePanelPage = context
			.pages()
			.find((p) => p.url() === SIDE_PANEL_URL);
		if (sidePanelPage) {
			await sidePanelPage.waitForSelector("#memo-textarea", {
				state: "visible",
				timeout: 5000,
			});
			return sidePanelPage;
		}
		// 고정 대기가 아니라 폴링 간격이다. 사이드 패널은 확장이 여는 페이지라 기다릴 이벤트가 마땅치 않아
		// 컨텍스트의 페이지 목록을 짧은 간격으로 다시 본다. 전체 제한 시간은 위 루프 조건이 건다.
		await page.waitForTimeout(100);
	}
	throw new Error(`Side panel page not found within ${timeout}ms`);
}

/**
 * 사이드 패널이 특정 URL의 메모 조회를 마칠 때까지 기다리는 promise를 만든다.
 * @description 사이드 패널은 활성 탭의 URL을 따라가 그 URL의 메모를 읽는다. 탭을 옮기는 동작보다 먼저 불러 둬야
 * 조회 응답을 놓치지 않는다. 이미 캐시된 URL로 돌아갈 때는 조회가 다시 나가지 않을 수 있으니 처음 가는 URL에만 쓴다.
 */
export const waitForSidePanelMemoQuery = ({
	sidePanelPage,
	url,
}: IFWaitForSidePanelMemoQueryParams) => {
	const pageKey = getPageKey(url);

	return sidePanelPage.waitForResponse(
		(response) =>
			!!getMemoQueryPageKeys(response.url())?.includes(pageKey) &&
			response.ok(),
	);
};

/**
 * 메모 조회 요청 URL에서 `page_key=in.(...)` 필터의 페이지 키 목록을 꺼낸다.
 * @description 메모 조회는 `.in("page_key", [pageKey, ""])`로 나간다. supabase-js는 `,()`가 든 값만 따옴표로 감싸므로
 * 따옴표를 벗긴다. 메모 조회가 아니거나 page_key 필터가 없으면 null이다.
 */
export const getMemoQueryPageKeys = (requestUrl: string) => {
	const url = new URL(requestUrl);
	const pageKeyFilter = url.searchParams.get("page_key");

	if (!url.pathname.endsWith("/rest/v1/memo") || !pageKeyFilter) {
		return null;
	}

	const inFilterMatch = pageKeyFilter.match(/^in\.\((.*)\)$/);

	if (!inFilterMatch) {
		return null;
	}

	return inFilterMatch[1]
		.split(",")
		.map((pageKey) => pageKey.replace(/^"(.*)"$/, "$1"));
};

/**
 * 확장이 있을 때만 뜨는 첫 방문 가이드를 끈다.
 * @description 웹은 확장 manifest를 받아야 가이드를 시작하므로(apps/web/src/modules/guide/useGuide.ts)
 * 확장 없이 도는 web 프로젝트에는 필요 없다. 가이드가 뜨지 않는 것은 정상이다(완료 표시를 먼저 심었거나
 * manifest가 늦다). 가이드가 떴는데 닫히지 않을 때만 던진다.
 */
export async function skipGuide(page: Page) {
	// 가이드가 시작되기 전에 완료 표시를 심으면 아예 뜨지 않는다.
	await page.evaluate(() => {
		localStorage.setItem("guide", JSON.stringify(true));
	});

	const guidePopover = page.locator("#driver-popover-content");
	const isGuideVisible = await guidePopover
		.waitFor({ state: "visible", timeout: 2000 })
		.then(() => true)
		.catch((error: unknown) => {
			if (error instanceof errors.TimeoutError) {
				return false;
			}
			throw error;
		});

	if (!isGuideVisible) {
		return;
	}

	// 이미 떠 있으면 완료 표시를 읽도록 다시 불러 닫는다.
	await page.reload();
	await guidePopover.waitFor({ state: "hidden", timeout: 5000 });
}

/** {@link waitForSidePanelMemoQuery}의 인자. */
interface IFWaitForSidePanelMemoQueryParams {
	/** 확장의 사이드 패널 페이지 ({@link findSidePanelPage}) */
	sidePanelPage: Page;
	/** 메모를 조회할 탭 URL */
	url: string;
}
