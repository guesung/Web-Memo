import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { TECH_ARTICLE_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

interface TechArticlePageProps extends LanguageParams {}

export default async function TechArticlePage({
	params,
}: TechArticlePageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={TECH_ARTICLE_PAGE} />;
}
