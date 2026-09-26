import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { chromium, expect, test } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import {
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../tests/lib";
import {
	createMockCategory,
	createMockMemo,
	createMockSetting,
	guardUnhandledSupabaseRequests,
	MockSupabaseStore,
	mockSummaryApi,
	setupSupabaseMocks,
} from "../tests/lib/mocks";
import {
	DEMO_ARTICLE_URL,
	DEMO_CONTENT,
	DEMO_VIDEO_THUMBNAIL_URL,
	DEMO_VIDEO_URL,
	type TStoreLanguage,
} from "./demoData";

// 확장이 여는 사이드 패널은 Playwright가 기본으로 붙지 않는 타깃이라, 붙도록 켠다(tests/fixtures/extension.ts와 같다).
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const REPO_ROOT = path.join(__dirname, "..", "..");
const WEB_URL = "http://localhost:3000";

/**
 * 템플릿의 브라우저 창 틀 안 콘텐츠 영역 크기(CSS px). template.html의 `.frame-content`와 맞춰야 한다.
 * 기기 배율 2로 찍어 템플릿에서 줄이거나 확대해도 흐려지지 않게 한다.
 */
const PAGE_SIZE = { width: 760, height: 586 };
const SIDE_PANEL_SIZE = { width: 400, height: 586 };
/** 4번 장의 웹 대시보드. 데스크톱 레이아웃이 나오는 폭으로 찍고 템플릿이 줄여 넣는다. */
const DASHBOARD_SIZE = { width: 1280, height: 815 };
/** 대시보드 탭의 브라우저 시계를 앞당기는 양. 서버가 심은 카테고리 캐시(5분)를 넘겨야 한다. */
const DASHBOARD_CLOCK_OFFSET_MS = 10 * 60 * 1000;

test.describe.configure({ mode: "serial" });

for (const language of ["ko", "en"] as const) {
	test(`${language} 스토어 스크린샷 원본을 캡처한다`, async () => {
		const outputDirectory = path.join(__dirname, "output", language, "raw");
		const content = DEMO_CONTENT[language];
		const context = await launchExtensionContext(language);
		const unhandledSupabaseRequests =
			await guardUnhandledSupabaseRequests(context);

		try {
			await mkdir(outputDirectory, { recursive: true });

			const page = await context.newPage();
			await setupDemoRoutes({ page, context, language });
			await closeInstallTab(context);
			await login(page);
			await context.addCookies([
				{ name: "i18next", value: language, url: WEB_URL, sameSite: "Strict" },
			]);
			await skipGuide(page);

			await page.setViewportSize(PAGE_SIZE);
			await page.goto(DEMO_ARTICLE_URL);
			await openSidePanel(page);
			const sidePanelPage = await findSidePanelPage(page, 15000);
			await sidePanelPage.setViewportSize(SIDE_PANEL_SIZE);
			// 사이드 패널은 창의 활성 탭을 따라간다. 패널 탭이 열리며 활성 탭을 가져갔으므로 기사 탭을 되돌린다.
			await page.bringToFront();

			await waitForSidePanelMemo({
				sidePanelPage,
				pageTitle: await page.title(),
				memo: content.articleMemo.memo,
			});
			await captureSidePanelScene({
				page,
				sidePanelPage,
				outputDirectory,
				name: "article",
			});

			await page.goto(DEMO_VIDEO_URL);
			await expect(page.locator("img")).toHaveJSProperty("complete", true);
			await waitForSidePanelMemo({
				sidePanelPage,
				pageTitle: await page.title(),
				memo: content.videoMemo.memo,
			});
			const summaryLabel = await sidePanelPage.evaluate(() =>
				chrome.i18n.getMessage("summary_generate_label"),
			);
			await sidePanelPage.getByRole("button", { name: summaryLabel }).click();
			await expect(sidePanelPage.getByRole("tabpanel")).toContainText(
				content.summaryChunks.at(-1)?.replace(/^- /, "") ?? "",
			);
			await captureSidePanelScene({
				page,
				sidePanelPage,
				outputDirectory,
				name: "video",
			});

			await captureDashboard({ page, language, outputDirectory });
		} finally {
			await context.close();
		}

		expect(unhandledSupabaseRequests, "목 없는 Supabase 요청").toEqual([]);
	});
}

/**
 * 언어를 고정한 확장 사본을 올린 크로미움을 띄운다.
 * @description macOS 크로미움은 `--lang`을 무시하고 시스템 언어로 `chrome.i18n`을 고른다. 그래서 dist를 복사해
 * 해당 언어의 `_locales`만 남기고 `default_locale`을 그 언어로 바꾼다. 매니페스트의 key가 같아 확장 id는 그대로다.
 */
const launchExtensionContext = async (language: TStoreLanguage) => {
	const sourceDirectory = path.join(REPO_ROOT, "dist");
	const extensionDirectory = path.join(
		__dirname,
		".tmp",
		`extension-${language}`,
	);
	const manifestPath = path.join(extensionDirectory, "manifest.json");

	await rm(extensionDirectory, { recursive: true, force: true });
	await cp(sourceDirectory, extensionDirectory, { recursive: true });

	for (const localeDirectory of ["ko", "en"]) {
		if (localeDirectory !== language) {
			await rm(path.join(extensionDirectory, "_locales", localeDirectory), {
				recursive: true,
				force: true,
			});
		}
	}

	const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	await writeFile(
		manifestPath,
		JSON.stringify({ ...manifest, default_locale: language }),
	);

	const context = await chromium.launchPersistentContext("", {
		locale: language === "ko" ? "ko-KR" : "en-US",
		deviceScaleFactor: 2,
		colorScheme: "light",
		headless: false,
		args: [
			"--headless=new",
			`--accept-lang=${language === "ko" ? "ko-KR" : "en-US"}`,
			`--disable-extensions-except=${extensionDirectory}`,
			`--load-extension=${extensionDirectory}`,
		],
	});

	// 직접 띄운 컨텍스트라 설정 파일의 use가 닿지 않는다. login()의 waitForURL은 기본값이면 끝없이 기다려,
	// 로그인이 막혔을 때 어디서 멈췄는지 드러나지 않으므로 상한을 건다.
	context.setDefaultTimeout(30 * 1000);

	return context;
};

/**
 * 확장이 설치 직후 여는 웹 메모 탭을 닫는다.
 * @description 설치 탭은 비동기로 늦게 열리고 `ext_cid` 쿼리가 붙는다. 캡처 중에 열리면 활성 탭을 가져가
 * 사이드 패널이 엉뚱한 페이지를 따라가므로, 열릴 때까지 최대 20초 기다렸다가 닫는다.
 */
const closeInstallTab = async (context: BrowserContext) => {
	await expect
		.poll(
			() => context.pages().some((page) => page.url().includes("ext_cid=")),
			{
				timeout: 20000,
			},
		)
		.toBe(true)
		.catch(() => {
			// 설치 탭을 열지 않는 환경이면 닫을 것이 없다.
		});

	for (const page of context.pages()) {
		if (page.url().includes("ext_cid=")) {
			await page.close();
		}
	}
};

/**
 * 시연 데이터를 목 저장소에 넣고, 시연 페이지·요약·과거 메모 API를 가로챈다.
 * @description 로그인(`/auth/v1`)만 실제로 나간다. 메모·카테고리 REST는 목 저장소가, 요약은 목 SSE가 받는다.
 * 과거 메모 판정 API는 웹 서버가 실제 계정 데이터를 읽으므로 빈 응답으로 막는다.
 */
const setupDemoRoutes = async ({
	page,
	context,
	language,
}: IFSetupDemoRoutesParams) => {
	const content = DEMO_CONTENT[language];
	const store = new MockSupabaseStore();
	const demoArticleHtml = await readFile(
		path.join(__dirname, "demoArticle.html"),
		"utf8",
	);
	const now = Date.now();

	const demoMemos = [
		content.articleMemo,
		content.videoMemo,
		...content.otherMemos,
	];

	store.setSetting(createMockSetting());
	for (const category of content.categories) {
		const memoCount = demoMemos.filter(
			(demoMemo) => demoMemo.categoryId === category.id,
		).length;

		store.addCategory(
			createMockCategory({ ...category, memo_count: memoCount }),
		);
	}
	for (const demoMemo of demoMemos) {
		// 대시보드 탭은 시계가 앞당겨져 있으므로 그 시각 기준으로 "n분 전"이 되게 맞춘다.
		const updatedAt = new Date(
			now + DASHBOARD_CLOCK_OFFSET_MS - demoMemo.minutesAgo * 60 * 1000,
		).toISOString();

		store.addMemo(
			createMockMemo({
				url: demoMemo.url,
				title: demoMemo.title,
				memo: demoMemo.memo,
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
	await context.route(`${WEB_URL}/api/past-memo`, (route) =>
		route.fulfill({ json: { duplicate: null, related: [] } }),
	);
	await context.route(
		`${new URL(DEMO_ARTICLE_URL).origin}/**`,
		async (route) => {
			const requestUrl = route.request().url();

			if (requestUrl.includes("/__fonts/")) {
				await route.fulfill({
					path: path.join(
						REPO_ROOT,
						"apps/web/src/fonts/PretendardVariable.woff2",
					),
				});
				return;
			}
			if (requestUrl !== DEMO_ARTICLE_URL) {
				await route.fulfill({ status: 404 });
				return;
			}

			await route.fulfill({
				contentType: "text/html; charset=utf-8",
				body: demoArticleHtml.replace("__LANG__", language),
			});
		},
	);
	await context.route(
		(url) => url.href === DEMO_VIDEO_URL,
		(route) =>
			route.fulfill({
				contentType: "text/html; charset=utf-8",
				body: createVideoPageHtml(language),
			}),
	);
};

/**
 * 사이드 패널이 현재 탭의 제목과 메모를 다 그릴 때까지 기다린다.
 * @description 탭을 옮긴 직후에는 이전 페이지의 제목·메모가 남아 있으므로 둘 다 새 값으로 바뀐 것을 확인한다.
 */
const waitForSidePanelMemo = async ({
	sidePanelPage,
	pageTitle,
	memo,
}: IFWaitForSidePanelMemoParams) => {
	await expect(sidePanelPage.locator("header")).toContainText(pageTitle);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(memo);
	await expect(
		sidePanelPage.locator('[data-save-status="saving"]'),
	).toHaveCount(0);
};

/** 사이드 패널과 옆에 둔 페이지를 각각 찍는다. 입력칸 포커스 링이 찍히지 않도록 포커스를 뺀다. */
const captureSidePanelScene = async ({
	page,
	sidePanelPage,
	outputDirectory,
	name,
}: IFCaptureSceneParams) => {
	await sidePanelPage.evaluate(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	});
	await screenshotWhenStable({
		page: sidePanelPage,
		path: path.join(outputDirectory, `${name}-side-panel.png`),
	});
	await screenshotWhenStable({
		page,
		path: path.join(outputDirectory, `${name}-page.png`),
	});
};

/**
 * 웹 대시보드(/memos)를 목 데이터로 찍는다.
 * @description 사이드바 카테고리는 서버 컴포넌트가 실제 계정에서 미리 읽어 5분 캐시로 심는다(목이 닿지 않는다).
 * 브라우저의 Date만 10분 앞당겨 심긴 캐시를 처음부터 만료된 것으로 보이게 하면, 화면이 붙자마자 목 저장소에서
 * 다시 읽는다. Playwright의 가짜 시계는 타이머까지 멈춰 메모 카드가 그려지지 않으므로 쓰지 않는다.
 * 개발 서버에서만 뜨는 Next.js 표시와 React Grab, 떠 있는 상담 버튼과 알림 토스트(상담 연결 실패 등)는 화면에서 숨긴다.
 */
const captureDashboard = async ({
	page,
	language,
	outputDirectory,
}: IFCaptureDashboardParams) => {
	const content = DEMO_CONTENT[language];
	// 전체 목록은 위시리스트 메모를 빼고 보여준다.
	const listedMemoCount = [
		content.articleMemo,
		content.videoMemo,
		...content.otherMemos,
	].filter((demoMemo) => !demoMemo.isWish).length;

	await page.addInitScript((offsetMilliseconds) => {
		const RealDate = Date;

		class ShiftedDate extends RealDate {
			constructor(...args: ConstructorParameters<DateConstructor> | []) {
				if (args.length === 0) {
					super(RealDate.now() + offsetMilliseconds);
					return;
				}

				super(...(args as ConstructorParameters<DateConstructor>));
			}

			static now() {
				return RealDate.now() + offsetMilliseconds;
			}
		}

		globalThis.Date = ShiftedDate as DateConstructor;
	}, DASHBOARD_CLOCK_OFFSET_MS);
	await page.setViewportSize(DASHBOARD_SIZE);
	await page.goto(`/${language}${PATHS.memos}`);
	await expect(page.locator(".memo-item")).toHaveCount(listedMemoCount);
	await expect(
		page.getByRole("link", { name: content.categories.at(-1)?.name }),
	).toBeVisible();
	await page.addStyleTag({
		content: `nextjs-portal, #react-grab-root, [data-react-grab], [aria-label="채널톡 문의 열기"], [aria-label="Open support chat"], [role="region"]:has(> ol) { display: none !important; }`,
	});
	await page.mouse.move(0, 0);
	await screenshotWhenStable({
		page,
		path: path.join(outputDirectory, "dashboard.png"),
	});
};

/**
 * 연달아 찍은 두 장이 같아질 때까지 다시 찍고 마지막 장을 저장한다.
 * @description 창 크기를 바꾼 직후나 백그라운드 탭은 이전 크기의 화면이 타일처럼 반복돼 찍히기도 하고,
 * 폰트·이미지·전환 효과가 늦게 끝나기도 한다. 그려진 결과가 멈춘 것을 직접 확인한다.
 * @throws 다섯 번 안에 화면이 멈추지 않으면 던진다.
 */
const screenshotWhenStable = async ({
	page,
	path: outputPath,
}: IFScreenshotWhenStableParams) => {
	let previousScreenshot = await page.screenshot({ animations: "disabled" });

	for (let attempt = 0; attempt < 5; attempt += 1) {
		await page.waitForTimeout(300);
		const currentScreenshot = await page.screenshot({ animations: "disabled" });

		if (currentScreenshot.equals(previousScreenshot)) {
			await writeFile(outputPath, currentScreenshot);
			return;
		}

		previousScreenshot = currentScreenshot;
	}

	throw new Error(`화면이 멈추지 않아 캡처하지 못했습니다: ${outputPath}`);
};

/**
 * 요약 장면(5번)에 쓰는 영상 페이지 HTML을 만든다.
 * @description 유튜브 화면을 그대로 띄우면 광고·추천 영상(타인 콘텐츠)이 섞이므로, 플레이어·제목·설명만 있는 페이지를 직접 그린다.
 * 영상은 CC BY 3.0이라 설명란에 저작자와 라이선스를 적는다.
 */
const createVideoPageHtml = (language: TStoreLanguage) => `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${DEMO_CONTENT[language].videoMemo.title}</title>
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
<div class="player"><img src="${DEMO_VIDEO_THUMBNAIL_URL}" alt="" /><div class="play"></div></div>
<h1>${DEMO_CONTENT[language].videoMemo.title}</h1>
<div class="channel">Blender</div>
<div class="description">${DEMO_CONTENT[language].videoDescription}<br />© Blender Foundation · CC BY 3.0 · peach.blender.org</div>
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

/** {@link waitForSidePanelMemo}의 인자. */
interface IFWaitForSidePanelMemoParams {
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 사이드 패널 머리글에 보여야 할 현재 탭 제목 */
	pageTitle: string;
	/** 메모 칸에 채워져 있어야 할 메모 본문 */
	memo: string;
}

/** {@link captureSidePanelScene}의 인자. */
interface IFCaptureSceneParams {
	/** 사이드 패널 옆에 놓일 웹 페이지 탭 */
	page: Page;
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 원본 PNG를 쓸 폴더 */
	outputDirectory: string;
	/** 파일 이름 앞부분. `<name>-page.png`, `<name>-side-panel.png`로 저장한다 */
	name: string;
}

/** {@link screenshotWhenStable}의 인자. */
interface IFScreenshotWhenStableParams {
	/** 찍을 페이지 */
	page: Page;
	/** 저장할 PNG 경로 */
	path: string;
}

/** {@link captureDashboard}의 인자. */
interface IFCaptureDashboardParams {
	/** 로그인한 웹 탭 */
	page: Page;
	/** 대시보드 언어 */
	language: TStoreLanguage;
	/** 원본 PNG를 쓸 폴더 */
	outputDirectory: string;
}
