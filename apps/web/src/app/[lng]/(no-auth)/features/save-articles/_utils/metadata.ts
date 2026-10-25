import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/features/save-articles",
	title: "웹페이지 저장 - 아티클 나중에 보기 | 웹 메모",
	description:
		"관심 있는 아티클과 웹페이지를 위시리스트에 저장하세요. 나중에 볼 콘텐츠를 체계적으로 관리하고 언제든지 다시 찾아볼 수 있습니다. 무료 크롬 확장 프로그램.",
	keywords: [
		"웹페이지 저장",
		"아티클 저장",
		"나중에 보기",
		"위시리스트",
		"북마크 관리",
		"save articles",
		"콘텐츠 저장",
	],
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/features/save-articles",
	title: "Save Web Pages - Read Articles Later | Web Memo",
	description:
		"Save interesting articles and web pages to your wishlist. Organize content to read later and easily find them anytime. Free Chrome extension.",
	keywords: [
		"save web pages",
		"save articles",
		"read later",
		"wishlist",
		"bookmark manager",
		"content saving",
		"article organizer",
	],
});
