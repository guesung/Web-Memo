import { createPublicPageMetadata } from "../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/introduce",
	title: "웹 메모 - 읽던 페이지 옆에서 바로 적는 메모",
	description:
		"읽던 페이지 옆에서 바로 적어요. 웹 메모의 사이드 패널에 생각을 적으면 페이지 제목과 주소가 함께 남아요. 같은 계정으로 웹과 앱에서 메모를 확인할 수 있어요.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/introduce",
	title: "Web Memo - Write Beside the Page You Are Reading",
	description:
		"Write beside the page you are reading. Web Memo keeps the page title and URL with your note. View your notes on web and app with the same account.",
});
