import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/developer",
	title: "개발자를 위한 웹 메모 - 코드 스니펫 & 기술 자료 정리 | 웹 메모",
	description:
		"Stack Overflow 답변, GitHub 이슈, 기술 블로그를 체계적으로 정리하세요. 개발 지식을 한 곳에서 관리할 수 있습니다.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const createMetadataEnglish = (title: string) =>
	createPublicPageMetadata({
		language: "en",
		path: "/use-cases/developer",
		title,
		description:
			"Organize Stack Overflow answers, GitHub issues, and tech blogs systematically. Manage your development knowledge in one place.",
	});

export async function getMetadata(lng: Language) {
	if (lng === "ko") return metadataKorean;
	const { t } = await getTranslation(lng);
	return createMetadataEnglish(t("seoTitles.developer"));
}
