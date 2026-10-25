import { createPublicPageMetadata } from "../../../_utils";
import { COMPARE_LAST_CHECKED_DATE, COMPARE_PAGE_PATH } from "../_constants";

/** 한국어로만 존재하는 비교 페이지의 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: COMPARE_PAGE_PATH,
	title:
		"크롬 메모 확장 프로그램 추천 비교 — 웹 메모·노션 웹 클리퍼·라이너·Glasp·Keep",
	description: `웹 메모·노션 웹 클리퍼·라이너·Glasp·Google Keep 확장을 기록 방식, 하이라이트, AI 요약, 유튜브, 내보내기, 한국어 화면, 로그인 등 8가지 기준으로 각 공식 페이지를 확인해 비교했습니다(${COMPARE_LAST_CHECKED_DATE} 확인).`,
	keywords: [
		"크롬 메모 확장 프로그램",
		"크롬 메모 확장 추천",
		"크롬 확장 프로그램 메모",
		"노션 웹 클리퍼",
		"라이너",
		"Glasp",
		"Google Keep 확장",
	],
	isKoreanOnly: true,
});
