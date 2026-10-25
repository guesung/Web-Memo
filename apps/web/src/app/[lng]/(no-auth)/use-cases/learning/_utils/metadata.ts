import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/learning",
	title: "온라인 학습을 위한 웹 메모 | 웹 메모",
	description:
		"온라인 강의, 유튜브 교육 영상을 보면서 효율적으로 학습하세요. 중요한 내용을 메모에 적고 강의 주소와 함께 저장해 복습할 수 있습니다.",
	keywords: [
		"온라인 학습",
		"인강 메모",
		"유튜브 학습",
		"강의 노트",
		"학습 도구",
		"online learning",
		"교육 영상 정리",
	],
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/use-cases/learning",
	title: "Web Memo for Online Learning | Web Memo",
	description:
		"Learn efficiently while watching online courses and YouTube tutorials. Write notes on key content, save the lecture URL, and review later.",
	keywords: [
		"online learning",
		"course notes",
		"youtube learning",
		"lecture notes",
		"learning tool",
		"study helper",
		"educational video notes",
	],
});
