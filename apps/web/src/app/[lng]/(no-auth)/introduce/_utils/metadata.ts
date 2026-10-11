import { createPublicPageMetadata } from "../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/introduce",
	title: "웹 메모 - 칠하고, 바로 옆에 생각을 적어요",
	description:
		"읽던 글에서 문장을 칠하고, 그 옆에 떠오른 생각을 적어요. 칠한 문장과 메모는 출처와 함께 한곳에 모여요. 같은 계정으로 웹과 앱에서 확인할 수 있어요.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/introduce",
	title: "Web Memo - Highlight It, Write Beside It",
	description:
		"Highlight a passage in what you're reading and write down what it made you think. Highlights and notes gather in one place, with their source.",
});
