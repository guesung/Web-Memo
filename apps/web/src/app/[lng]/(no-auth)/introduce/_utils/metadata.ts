import { createPublicPageMetadata } from "../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/introduce",
	title: "웹 메모 - 웹페이지 읽으며 바로 메모하는 크롬 확장",
	description:
		"읽던 페이지에서 바로 메모하고, 웹과 앱에서 다시 꺼내 보세요. 웹 메모 크롬 확장의 사이드 패널에서 아티클을 기록하고, 유튜브 영상을 AI로 요약하며, 메모를 관리하세요. 무료로 시작하세요.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/introduce",
	title: "Web Memo - Take Notes While Browsing | Chrome Extension",
	description:
		"Take notes on the page you’re reading, then revisit them on the web or in the app. Use the Web Memo Chrome extension’s side panel to capture ideas, summarize YouTube videos with AI, and organize notes. Free to start.",
});
