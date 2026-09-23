import { createPublicPageMetadata } from "../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/privacy",
	title: "개인정보처리방침 | 웹 메모",
	description:
		"웹 메모가 수집하는 사용자 데이터와 그 이용·보관·공유 방식, 확장 프로그램 권한 사용 이유, 데이터 처리를 위탁하는 제3자 목록을 안내합니다.",
	robots: {
		index: true,
		follow: true,
	},
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const metadataEnglish = createPublicPageMetadata({
	language: "en",
	path: "/privacy",
	title: "Privacy Policy | Web Memo",
	description:
		"How Web Memo collects, uses, retains, and shares user data, why each extension permission is required, and the full list of third parties that process your data.",
	robots: {
		index: true,
		follow: true,
	},
});
