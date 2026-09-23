import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/developer",
	title: "개발자를 위한 웹 메모 - 코드 스니펫 & 기술 자료 정리 | 웹 메모",
	description:
		"Stack Overflow 답변, GitHub 이슈, 기술 블로그를 체계적으로 정리하세요. 개발 지식을 한 곳에서 관리할 수 있습니다.",
	keywords: [
		"개발자 메모",
		"코드 스니펫 저장",
		"기술 블로그 정리",
		"Stack Overflow 답변 저장",
		"GitHub 이슈 메모",
		"개발 문서 정리",
	],
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/use-cases/developer",
	title: "Web Memo for Developers - Code Snippets & Tech Resources | Web Memo",
	description:
		"Organize Stack Overflow answers, GitHub issues, and tech blogs systematically. Manage your development knowledge in one place.",
	keywords: [
		"developer notes",
		"code snippet saver",
		"tech blog organizer",
		"Stack Overflow clipper",
		"GitHub issue notes",
		"documentation notes",
	],
});
