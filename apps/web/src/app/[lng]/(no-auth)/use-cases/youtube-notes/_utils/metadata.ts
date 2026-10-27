import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/youtube-notes",
	title: "유튜브 메모 - 영상 보면서 메모하기 | 웹 메모",
	description:
		"유튜브 영상을 보면서 중요한 내용을 바로 메모하세요. 강의, 튜토리얼, 리뷰 영상의 핵심을 기록하고 나중에 쉽게 찾아볼 수 있습니다.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/use-cases/youtube-notes",
	title: "YouTube Notes - Take Notes While Watching | Web Memo",
	description:
		"Take notes while watching YouTube videos. Capture key points from lectures, tutorials, and reviews. Find them easily later.",
});
