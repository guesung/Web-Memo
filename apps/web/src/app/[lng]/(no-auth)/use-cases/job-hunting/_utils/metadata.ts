import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { createPublicPageMetadata } from "../../../_utils";

/** 공개 페이지의 한국어 검색 및 공유 메타데이터입니다. */
export const metadataKorean = createPublicPageMetadata({
	language: "ko",
	path: "/use-cases/job-hunting",
	title: "취업 준비 - 채용공고 & 회사 정보 정리 | 웹 메모",
	description:
		"채용공고, 회사 정보, 면접 준비 자료를 체계적으로 정리하세요. 지원한 회사와 포지션을 한눈에 관리할 수 있습니다.",
});
/** 공개 페이지의 영어 검색 및 공유 메타데이터입니다. */
export const createMetadataEnglish = (title: string) =>
	createPublicPageMetadata({
		language: "en",
		path: "/use-cases/job-hunting",
		title,
		description:
			"Organize job postings, company information, and interview prep materials systematically. Manage applications and positions at a glance.",
	});

export async function getMetadata(lng: Language) {
	if (lng === "ko") return metadataKorean;
	const { t } = await getTranslation(lng);
	return createMetadataEnglish(t("seoTitles.jobHunting"));
}
