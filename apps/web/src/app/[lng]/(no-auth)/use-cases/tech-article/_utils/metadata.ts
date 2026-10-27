import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/tech-article",
	title: "기술 아티클 정리 도구 - 개발 블로그 & 뉴스레터 관리 | 웹 메모",
	description:
		"기술 블로그, 뉴스레터, 개발 아티클의 핵심 내용을 체계적으로 정리하세요. AI 요약으로 빠르게 파악하고 주제별로 관리할 수 있습니다.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const createMetadataEnglish = (title: string) =>
	createPublicPageMetadata({
		language: "en",
		path: "/use-cases/tech-article",
		title,
		description:
			"Organize key insights from tech blogs, newsletters, and dev articles systematically. Use AI summaries to quickly grasp content and manage by topic.",
	});

export async function getMetadata(lng: Language) {
	if (lng === "ko") return metadataKorean;
	const { t } = await getTranslation(lng);
	return createMetadataEnglish(t("seoTitles.techArticle"));
}
