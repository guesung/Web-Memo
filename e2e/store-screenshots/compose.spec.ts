import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";
import {
	DEMO_ARTICLE_URL,
	DEMO_CONTENT,
	DEMO_VIDEO_URL,
	type TStoreLanguage,
} from "./demoData";

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

/** 장별 헤드라인. 스토어 등록 문구로 확정된 값이라 바꾸지 않는다. */
const HEADLINES: Record<TStoreLanguage, string[]> = {
	ko: [
		"읽던 페이지 옆에서 바로 적어요",
		"Alt+S 한 번이면 열려요",
		"어디서 본 글인지 알아서 남아요",
		"적은 메모는 웹과 앱에서 모아 봐요",
		"긴 글은 요약으로 먼저 훑어봐요",
	],
	en: [
		"Write right beside the page you're reading",
		"Open it with a single Alt+S",
		"It remembers where you read it",
		"Find your notes on the web and in the app",
		"Skim long content with a summary first",
	],
};

for (const language of ["ko", "en"] as const) {
	test(`${language} 스토어 스크린샷 5장을 합성한다`, async ({ page }) => {
		const rawDirectory = path.join(__dirname, "output", language, "raw");
		const rawImage = (fileName: string) =>
			pathToFileURL(path.join(rawDirectory, fileName)).href;
		const mobileImage = await findMobileImage();

		for (const fileName of [
			"article-page.png",
			"article-side-panel.png",
			"video-page.png",
			"video-side-panel.png",
			"dashboard.png",
		]) {
			await access(path.join(rawDirectory, fileName)).catch(() => {
				throw new Error(
					`원본 캡처가 없습니다: ${path.join(rawDirectory, fileName)}. capture 프로젝트를 먼저 돌리세요.`,
				);
			});
		}

		if (!mobileImage) {
			console.warn(
				`[store-screenshots] assets/에 모바일 앱 스크린샷이 없어 4번 장에 자리표시 상자를 넣습니다: ${path.join(__dirname, "assets")}`,
			);
		}

		const articleUrl = new URL(DEMO_ARTICLE_URL);
		const videoUrl = new URL(DEMO_VIDEO_URL);
		const articleScene = {
			tabTitle: DEMO_CONTENT[language].articleMemo.title,
			tabIconLetter: "F",
			addressHost: articleUrl.host,
			addressPath: articleUrl.pathname,
			pageImage: rawImage("article-page.png"),
			sidePanelImage: rawImage("article-side-panel.png"),
		};
		const scenes: IFSceneInput[] = [
			articleScene,
			articleScene,
			articleScene,
			{
				tabTitle: language === "ko" ? "웹 메모" : "Web Memo",
				tabIconLetter: "W",
				addressHost: "webmemo.xyz",
				addressPath: `/${language}/memos`,
				dashboardImage: rawImage("dashboard.png"),
			},
			{
				tabTitle: DEMO_CONTENT[language].videoMemo.title,
				tabIconLetter: "▶",
				addressHost: videoUrl.host,
				addressPath: `${videoUrl.pathname}${videoUrl.search}`,
				pageImage: rawImage("video-page.png"),
				sidePanelImage: rawImage("video-side-panel.png"),
			},
		].map((scene, index) => ({
			...scene,
			sceneNumber: index + 1,
			language,
			headline: HEADLINES[language][index],
			mobileImage,
			mobilePlaceholderText: "assets/ 에 모바일 앱 스크린샷을 넣어 주세요",
		}));

		for (const scene of scenes) {
			await page.goto(
				pathToFileURL(path.join(__dirname, "template.html")).href,
			);
			await page.evaluate(
				(sceneInput) => window.renderScene(sceneInput),
				scene,
			);
			await page.screenshot({
				path: path.join(
					__dirname,
					"output",
					language,
					`screenshot-${scene.sceneNumber}.png`,
				),
			});
		}
	});
}

/**
 * assets/에서 모바일 앱 스크린샷을 찾는다. 이름순으로 첫 이미지 파일을 쓴다.
 * @returns 파일 URL. 이미지가 없으면 null
 */
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
	/** 창 틀 탭에 보일 제목 */
	tabTitle: string;
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
	/** 4번 장의 모바일 앱 스크린샷. 없으면 자리표시 상자를 그린다 */
	mobileImage: string | null;
	/** 모바일 스크린샷이 없을 때 자리표시 상자 문구 */
	mobilePlaceholderText: string;
}

declare global {
	interface Window {
		/** template.html이 정의한다. 장면을 채우고 이미지·글꼴 준비가 끝나면 끝난다 */
		renderScene: (scene: IFSceneInput) => Promise<void>;
	}
}
