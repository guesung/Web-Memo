import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import {
	createMockCategory,
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	mockSummaryApi,
	setupSupabaseMocks,
} from "../tests/lib/mocks";
import {
	DEMO_CONTENT,
	type IFDemoPage,
	type IFSubstituteVideo,
	type TStoreLanguage,
} from "./demoData";

/**
 * 대시보드 탭의 브라우저 시계를 앞당기는 양.
 * @description 서버가 심은 카테고리 캐시(5분)를 넘겨야 한다(sceneCapture.ts의 captureDashboard).
 * 메모 시각도 이만큼 앞당긴 시각을 기준으로 만들어 카드의 "n분 전"이 demoData의 값과 맞게 한다.
 */
export const DASHBOARD_CLOCK_OFFSET_MS = 10 * 60 * 1000;

/**
 * 시연 데이터를 목 저장소에 넣고, 시연 페이지·요약·과거 메모 API를 가로챈다.
 * @description 로그인(`/auth/v1`)만 실제로 나간다. 메모·카테고리 REST는 목 저장소가, 요약은 목 SSE가 받는다.
 * 과거 메모 판정 API는 웹 서버가 실제 계정 데이터를 읽으므로 빈 응답으로 막는다.
 * 기사·영상 중 realPage가 없는 쪽은 실제 사이트로 나가지 않고 로컬에서 만든 HTML로 응답한다.
 * 실제 유튜브를 쓸 때는 재생을 자동 재생 차단과 같은 방식(NotAllowedError)으로 막는다. 재생이 시작되면
 * 화면이 계속 바뀌어 캡처가 멈추지 않고, 차단되면 유튜브가 썸네일과 재생 버튼을 그대로 보여 준다.
 */
export const setupDemoRoutes = async ({
	page,
	context,
	language,
}: IFSetupDemoRoutesParams) => {
	const content = DEMO_CONTENT[language];
	const store = new MockSupabaseStore();
	const demoMemos = [
		content.articleMemo,
		content.videoMemo,
		...content.otherMemos,
	];
	const now = Date.now();

	store.setSetting(
		createMockSetting({ show_impression: content.showImpression }),
	);
	for (const category of content.categories) {
		const memoCount = demoMemos.filter(
			(demoMemo) => demoMemo.categoryId === category.id,
		).length;

		store.addCategory(
			createMockCategory({ ...category, memo_count: memoCount }),
		);
	}
	for (const demoMemo of demoMemos) {
		const updatedAt = new Date(
			now + DASHBOARD_CLOCK_OFFSET_MS - demoMemo.minutesAgo * 60 * 1000,
		).toISOString();

		store.addMemo(
			createMockMemo({
				url: demoMemo.url,
				title: demoMemo.title,
				memo: demoMemo.memo,
				impression: demoMemo.impression ?? null,
				actionItem: demoMemo.actionItem ?? null,
				favIconUrl: demoMemo.favIconUrl ?? null,
				category_id: demoMemo.categoryId,
				isWish: demoMemo.isWish ?? false,
				isStar: demoMemo.isStar ?? false,
				created_at: updatedAt,
				updated_at: updatedAt,
			}),
		);
	}

	await setupSupabaseMocks(page, store);
	await mockSummaryApi({ context, summaryChunks: content.summaryChunks });
	await context.route("http://localhost:3000/api/past-memo", (route) =>
		route.fulfill({ json: { duplicate: null, related: [] } }),
	);
	if (!content.articlePage.realPage) {
		await routeDemoArticle({ context, language, url: content.articlePage.url });
	}
	if (content.videoPage.realPage) {
		await page.addInitScript(() => {
			if (!location.hostname.endsWith("youtube.com")) {
				return;
			}

			HTMLMediaElement.prototype.play = () =>
				Promise.reject(new DOMException("autoplay blocked", "NotAllowedError"));
		});
		return;
	}

	const substituteVideo = content.substituteVideo;

	if (!substituteVideo) {
		throw new Error(
			"실제 영상 페이지를 쓰지 않으면 substituteVideo가 필요합니다.",
		);
	}

	await context.route(
		(url) => url.href === content.videoPage.url,
		(route) =>
			route.fulfill({
				contentType: "text/html; charset=utf-8",
				body: createVideoPageHtml({
					language,
					title: content.videoMemo.title,
					substituteVideo,
				}),
			}),
	);
};

/**
 * 캡처할 페이지로 이동하고, 실제 페이지면 본문이 뜬 뒤 가리는 요소를 CSS로 숨긴다.
 * @description 실제 페이지는 광고·추적 스크립트 때문에 load 이벤트가 늦으므로(brunch는 1분 가까이 걸렸다) DOM과 본문 요소만 기다린다.
 * 이미지가 다 그려졌는지는 캡처 쪽(screenshotWhenStable)이 화면이 멈출 때까지 기다려 확인한다.
 */
export const gotoDemoPage = async ({
	page,
	demoPage,
}: IFGotoDemoPageParams) => {
	await page.goto(demoPage.url, { waitUntil: "domcontentloaded" });

	if (!demoPage.realPage) {
		// 로컬 HTML은 썸네일·글꼴까지 금방 끝나므로 load를 기다린다.
		await page.waitForLoadState("load");
		return;
	}

	await page.locator(demoPage.realPage.readySelector).first().waitFor();
	await page.addStyleTag({ content: demoPage.realPage.style });
};

/** 시연 기사(demoArticle.html)와 그 글꼴을 기사 주소의 출처에서 응답한다. 나머지 경로는 404다. */
const routeDemoArticle = async ({
	context,
	language,
	url,
}: IFRouteDemoArticleParams) => {
	const demoArticleHtml = await readFile(
		path.join(__dirname, "demoArticle.html"),
		"utf8",
	);

	await context.route(`${new URL(url).origin}/**`, async (route) => {
		const requestUrl = route.request().url();

		if (requestUrl.includes("/__fonts/")) {
			await route.fulfill({
				path: path.join(
					__dirname,
					"../../apps/web/src/fonts/PretendardVariable.woff2",
				),
			});
			return;
		}
		if (requestUrl !== url) {
			await route.fulfill({ status: 404 });
			return;
		}

		await route.fulfill({
			contentType: "text/html; charset=utf-8",
			body: demoArticleHtml.replace("__LANG__", language),
		});
	});
};

/**
 * 요약 장면(5번)의 대체 영상 페이지 HTML을 만든다.
 * @description 실제 유튜브를 쓰지 않는 언어(영어판)에서 쓴다. 임베드 주소를 최상위로 열면 재생기 설정 오류(Error 153)가
 * 나므로 플레이어·제목·채널·설명만 있는 페이지를 직접 그린다.
 */
const createVideoPageHtml = ({
	language,
	title,
	substituteVideo,
}: IFCreateVideoPageHtmlParams) => `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
body { margin: 0; font-family: -apple-system, "Apple SD Gothic Neo", sans-serif; color: #0f0f0f; background: #fff; }
main { padding: 20px 24px; }
.player { position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 9; background: #000; }
.player img { width: 100%; height: 100%; object-fit: cover; display: block; }
.play { position: absolute; left: 50%; top: 50%; width: 68px; height: 48px; margin: -24px 0 0 -34px; border-radius: 14px; background: rgba(0, 0, 0, 0.72); }
.play::after { content: ""; position: absolute; left: 28px; top: 14px; border-style: solid; border-width: 10px 0 10px 17px; border-color: transparent transparent transparent #fff; }
h1 { font-size: 19px; margin: 14px 0 8px; line-height: 1.4; }
.channel { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.description { background: #f2f2f2; border-radius: 12px; padding: 12px 14px; font-size: 13px; line-height: 1.6; }
</style>
</head>
<body>
<main>
<div class="player"><img src="${substituteVideo.thumbnailUrl}" alt="" /><div class="play"></div></div>
<h1>${title}</h1>
<div class="channel">${substituteVideo.channelName}</div>
<div class="description">${substituteVideo.description}</div>
</main>
</body>
</html>`;

/** {@link setupDemoRoutes}의 인자. */
interface IFSetupDemoRoutesParams {
	/** 목 REST 라우트를 걸 기준 페이지. 라우트는 이 페이지의 컨텍스트 전체에 걸린다 */
	page: Page;
	/** 확장을 올린 브라우저 컨텍스트 */
	context: BrowserContext;
	/** 시연 데이터 언어 */
	language: TStoreLanguage;
}

/** {@link gotoDemoPage}의 인자. */
interface IFGotoDemoPageParams {
	/** 이동할 탭 */
	page: Page;
	/** 캡처할 페이지 */
	demoPage: IFDemoPage;
}

/** {@link routeDemoArticle}의 인자. */
interface IFRouteDemoArticleParams {
	/** 확장을 올린 브라우저 컨텍스트 */
	context: BrowserContext;
	/** 기사 언어 */
	language: TStoreLanguage;
	/** 기사 주소 */
	url: string;
}

/** {@link createVideoPageHtml}의 인자. */
interface IFCreateVideoPageHtmlParams {
	/** 페이지 언어 */
	language: TStoreLanguage;
	/** 영상 제목. 탭 제목과 본문 제목에 쓴다 */
	title: string;
	/** 썸네일·채널·설명 */
	substituteVideo: IFSubstituteVideo;
}
