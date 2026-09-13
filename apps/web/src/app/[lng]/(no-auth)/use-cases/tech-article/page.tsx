import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { TECH_ARTICLE_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface TechArticlePageProps extends LanguageParams {}

export default function TechArticlePage({
	params: { lng },
}: TechArticlePageProps) {
	return <LandingPageTemplate lng={lng} config={TECH_ARTICLE_PAGE} />;
}
