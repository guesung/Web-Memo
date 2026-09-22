import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/features/youtube-summary",
	title: "유튜브 영상 AI 요약 | 웹 메모",
	description:
		"유튜브 영상을 AI로 빠르게 요약하세요. 긴 영상도 핵심만 쏙쏙 뽑아 시간을 절약할 수 있습니다. 무료 크롬 확장 프로그램으로 지금 바로 시작하세요.",
	keywords: [
		"유튜브 요약",
		"영상 요약",
		"AI 요약",
		"유튜브 AI",
		"동영상 요약",
		"youtube summary",
		"영상 핵심 정리",
	],
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/features/youtube-summary",
	title: "YouTube Video AI Summary | Web Memo",
	description:
		"Summarize YouTube videos instantly with AI. Extract key points from long videos and save time. Get started now with our free Chrome extension.",
	keywords: [
		"youtube summary",
		"video summary",
		"AI summary",
		"youtube AI",
		"video summarizer",
		"youtube transcript summary",
		"video key points",
	],
});
