import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/news-reading",
	title: "뉴스 & 아티클 정리 - 읽으면서 메모하기 | 웹 메모",
	description:
		"뉴스, 블로그, 아티클을 읽으면서 중요한 내용을 바로 메모하세요. 인사이트를 체계적으로 정리하고 나중에 쉽게 찾아볼 수 있습니다.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const createMetadataEnglish = (title: string) =>
	createPublicPageMetadata({
		language: "en",
		path: "/use-cases/news-reading",
		title,
		description:
			"Take notes while reading news, blogs, and articles. Organize insights systematically and find them easily later.",
	});

export async function getMetadata(lng: Language) {
	if (lng === "ko") return metadataKorean;
	const { t } = await getTranslation(lng);
	return createMetadataEnglish(t("seoTitles.newsReading"));
}
