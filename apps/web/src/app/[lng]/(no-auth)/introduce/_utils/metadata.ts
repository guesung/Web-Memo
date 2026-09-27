import { createPublicPageMetadata } from "../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/introduce",
	title: "웹 메모 - 페이지 읽으며 메모하기",
	description:
		"글을 읽다가 떠오른 생각을 사이드 패널에 적어요. 페이지 제목과 주소는 자동으로 기록됩니다. 같은 계정으로 웹과 앱에서 메모를 확인할 수 있어요.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/introduce",
	title: "Web Memo - Take Notes While Reading",
	description:
		"Write down thoughts in the side panel as you read. The page title and URL are saved automatically. View your notes on web and app with the same account.",
});
