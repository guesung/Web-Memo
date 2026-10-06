import { access, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";
import sharp from "sharp";
import { DEMO_CONTENT, type IFDemoPage, type TStoreLanguage } from "./demoData";

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

/** 장별 헤드라인. 실제 제공되는 기능만 설명한다. */
const HEADLINES: Record<TStoreLanguage, string[]> = {
	ko: [
		"읽던 페이지 옆에서 바로 적어요",
		"Alt+S 한 번이면 열려요",
		"어디서 본 글인지 알아서 남아요",
		"적은 메모는 웹과 앱에서 모아 봐요",
		"카테고리별로 메모를 찾아봐요",
	],
	en: [
		"Write right beside the page you're reading",
		"Open it with a single Alt+S",
		"It remembers where you read it",
		"Find your notes on the web and in the app",
		"Find notes by category",
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
		const mobileImage = await findMobileImage();
		await mkdir(webDirectory, { recursive: true });

		for (const fileName of [
			"article-page.png",
			"article-side-panel.png",
			"category-dashboard.png",
			"dashboard.png",
			"article-memo-source.json",
			"page-titles.json",
		]) {
			await access(path.join(rawDirectory, fileName)).catch(() => {
				throw new Error(
					`원본 캡처가 없습니다: ${path.join(rawDirectory, fileName)}. capture 프로젝트를 먼저 돌리세요.`,
				);
			});
		}

		// 3번 장이 확대할 메모 출처의 세로 위치. capture가 사이드 패널에서 잰 값이다(sceneCapture.ts의 saveMemoSourceBox).
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
		const categoryAddressValue =
			language === "ko"
				? "업무-리서치"
				: encodeURIComponent(content.categories[0].name);
		const articleScene = {
			...toBrowserChrome({
				demoPage: content.articlePage,
				tabTitle: pageTitles.article,
			}),
			pageImage: rawImage("article-page.png"),
			sidePanelImage: rawImage("article-side-panel.png"),
		};
		const scenes: Omit<IFSceneInput, "output">[] = [
			articleScene,
			articleScene,
			articleScene,
			{
				tabTitle: language === "ko" ? "웹 메모" : "Web Memo",
				tabIconUrl: null,
				tabIconLetter: "W",
				addressHost: "webmemo.xyz",
				addressPath: `/${language}/memos`,
				dashboardImage: rawImage("dashboard.png"),
			},
			{
				tabTitle: language === "ko" ? "웹 메모" : "Web Memo",
				tabIconUrl: null,
				tabIconLetter: "W",
				addressHost: "webmemo.xyz",
				addressPath: `/${language}/memos?category=${categoryAddressValue}`,
				dashboardImage: rawImage("category-dashboard.png"),
			},
		].map((scene, index) => ({
			...scene,
			sceneNumber: index + 1,
			language,
			headline: HEADLINES[language][index],
			mobileImage,
			mobilePlaceholderText: "assets/ 에 모바일 앱 스크린샷을 넣어 주세요",
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

/** assets/에서 모바일 앱 스크린샷을 찾습니다. */
const findMobileImage = async () => {
	const assetsDirectory = path.join(__dirname, "assets");
	const fileNames = await readdir(assetsDirectory).catch(() => []);
	const imageFileName = fileNames
		.filter((fileName) => /\.(png|jpe?g|webp)$/i.test(fileName))
		.sort()[0];

	if (!imageFileName) {
		return null;
	}

	return pathToFileURL(path.join(assetsDirectory, imageFileName)).href;
};

/** template.html의 window.renderScene에 넘기는 장면 하나. */
interface IFSceneInput {
	/** 장 번호(1~5). 원 강조·키캡·확대·모바일 화면을 켤지 정한다 */
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
	/** 4번 장의 웹 대시보드 캡처 */
	dashboardImage?: string;
	/** 4번 장의 실제 한국어 모바일 앱 스크린샷 */
	mobileImage: string | null;
	/** 모바일 이미지가 없을 때 보여 줄 안내 문구입니다. */
	mobilePlaceholderText: string;
	/** 3번 장이 확대할 메모 출처의 사이드 패널 안 위쪽 위치(CSS px) */
	memoSourceTop: number;
	/** 3번 장이 확대할 메모 출처의 높이(CSS px) */
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
