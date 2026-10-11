import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";
import sharp from "sharp";
import { DEMO_CONTENT, type IFDemoPage, type TStoreLanguage } from "./demoData";

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

/** 장별 헤드라인. 실제 제공되는 기능만 설명한다. */
const HEADLINES: Record<TStoreLanguage, string[]> = {
	ko: [
		"칠하고, 바로 옆에 생각을 적어요",
		"드래그하고 색을 골라 칠해요",
		"Alt+S 한 번이면 열려요",
		"어디서 본 글인지 알아서 남아요",
		"칠한 문장과 메모를 한곳에서 모아 봐요",
	],
	en: [
		"Highlight it, then add a note beside it",
		"Drag over text and pick a color",
		"Open it with a single Alt+S",
		"It remembers where you read it",
		"See highlights and notes in one place",
	],
};

for (const language of ["ko", "en"] as const) {
	test(`${language} 스토어 스크린샷 5장을 합성한다`, async ({ page }) => {
		const rawDirectory = path.join(__dirname, "output", language, "raw");
		const webDirectory = path.join(
			__dirname,
			"../../apps/web/public/images/webps/introduction",
			language,
		);
		const rawImage = (fileName: string) =>
			pathToFileURL(path.join(rawDirectory, fileName)).href;
		await mkdir(webDirectory, { recursive: true });

		for (const fileName of [
			"article-page.png",
			"article-side-panel.png",
			"highlight-note-page.png",
			"highlight-select-page.png",
			"highlights-dashboard.png",
			"article-memo-source.json",
			"page-titles.json",
		]) {
			await access(path.join(rawDirectory, fileName)).catch(() => {
				throw new Error(
					`원본 캡처가 없습니다: ${path.join(rawDirectory, fileName)}. capture 프로젝트를 먼저 돌리세요.`,
				);
			});
		}

		// 4번 장이 확대할 메모 출처의 세로 위치. capture가 사이드 패널에서 잰 값이다(sceneCapture.ts의 saveMemoSourceBox).
		const memoSourceBox: { top: number; height: number } = JSON.parse(
			await readFile(
				path.join(rawDirectory, "article-memo-source.json"),
				"utf8",
			),
		);
		const pageTitles: { article: string } = JSON.parse(
			await readFile(path.join(rawDirectory, "page-titles.json"), "utf8"),
		);
		const content = DEMO_CONTENT[language];
		// 홍보 이미지의 주소창은 장식용이므로 한국어 장면에는 읽기 쉬운 예시 슬러그를 표시한다.
		const articleChrome = toBrowserChrome({
			demoPage: content.articlePage,
			tabTitle: pageTitles.article,
		});
		const sidePanelImage = rawImage("article-side-panel.png");
		// 1·2번 장은 칠하는 기사 화면이 주인공이다. 3·4번 장은 하이라이트가 남은 같은 기사 위에 오버레이를 얹는다.
		const scenes: Omit<IFSceneInput, "output">[] = [
			{
				...articleChrome,
				pageImage: rawImage("highlight-note-page.png"),
				sidePanelImage,
			},
			{
				...articleChrome,
				pageImage: rawImage("highlight-select-page.png"),
				sidePanelImage,
			},
			{
				...articleChrome,
				pageImage: rawImage("article-page.png"),
				sidePanelImage,
			},
			{
				...articleChrome,
				pageImage: rawImage("article-page.png"),
				sidePanelImage,
			},
			{
				tabTitle: language === "ko" ? "웹 메모" : "Web Memo",
				tabIconUrl: null,
				tabIconLetter: "W",
				addressHost: "webmemo.xyz",
				addressPath: `/${language}/highlights`,
				dashboardImage: rawImage("highlights-dashboard.png"),
			},
		].map((scene, index) => ({
			...scene,
			sceneNumber: index + 1,
			language,
			headline: HEADLINES[language][index],
			memoSourceTop: memoSourceBox.top,
			memoSourceHeight: memoSourceBox.height,
		}));

		for (const scene of scenes) {
			await page.goto(
				pathToFileURL(path.join(__dirname, "template.html")).href,
			);
			await page.evaluate((sceneInput) => window.renderScene(sceneInput), {
				...scene,
				output: "store" as const,
			});
			await page.screenshot({
				path: path.join(
					__dirname,
					"output",
					language,
					`screenshot-${scene.sceneNumber}.png`,
				),
			});
			await page.evaluate((sceneInput) => window.renderScene(sceneInput), {
				...scene,
				output: "web" as const,
			});
			const webPng = await page.screenshot();
			await sharp(webPng)
				.webp({ lossless: true, effort: 6 })
				.toFile(path.join(webDirectory, `${scene.sceneNumber}.webp`));
			if (language === "ko" && scene.sceneNumber === 1) {
				await page.setViewportSize({ width: 1200, height: 630 });
				await page.evaluate((sceneInput) => window.renderScene(sceneInput), {
					...scene,
					output: "og" as const,
				});
				await page.screenshot({
					path: path.join(__dirname, "../../apps/web/public/og-image.png"),
				});
				await page.setViewportSize({ width: 1280, height: 800 });
			}
		}
	});
}

/** 캡처한 페이지의 탭 제목·아이콘과 주소창 표시를 만듭니다. */
const toBrowserChrome = ({ demoPage, tabTitle }: IFToBrowserChromeParams) => {
	const url = new URL(demoPage.url);

	return {
		tabTitle,
		tabIconUrl: demoPage.tabIconUrl,
		tabIconLetter: demoPage.tabIconLetter,
		addressHost: url.host,
		addressPath: `${url.pathname}${url.search}`,
	};
};

/** template.html의 window.renderScene에 넘기는 장면 하나. */
interface IFSceneInput {
	/** 장 번호(1~5). 사이드 패널 흐림·원 강조·키캡·확대·대시보드를 켤지 정한다 */
	sceneNumber: number;
	/** 스크린샷 언어 */
	language: TStoreLanguage;
	/** 상단 헤드라인 */
	headline: string;
	/** 스토어·웹·OG 출력 모드 */
	output: "store" | "web" | "og";
	/** 창 틀 탭에 보일 제목 */
	tabTitle: string;
	/** 탭 아이콘 이미지. 없으면 tabIconLetter를 사용합니다. */
	tabIconUrl: string | null;
	/** 탭 아이콘 자리에 넣을 글자 */
	tabIconLetter: string;
	/** 주소창의 호스트(굵게 표시) */
	addressHost: string;
	/** 주소창의 경로와 쿼리 */
	addressPath: string;
	/** 창 왼쪽에 넣을 웹 페이지 캡처 */
	pageImage?: string;
	/** 창 오른쪽에 넣을 사이드 패널 캡처 */
	sidePanelImage?: string;
	/** 5번 장의 웹 하이라이트 대시보드 캡처 */
	dashboardImage?: string;
	/** 4번 장이 확대할 메모 출처의 사이드 패널 안 위쪽 위치(CSS px) */
	memoSourceTop: number;
	/** 4번 장이 확대할 메모 출처의 높이(CSS px) */
	memoSourceHeight: number;
}

/** 브라우저 프레임에 표시할 실제 페이지 정보입니다. */
interface IFToBrowserChromeParams {
	demoPage: IFDemoPage;
	tabTitle: string;
}

declare global {
	interface Window {
		/** template.html이 정의한다. 장면을 채우고 이미지·글꼴 준비가 끝나면 끝난다 */
		renderScene: (scene: IFSceneInput) => Promise<void>;
	}
}
