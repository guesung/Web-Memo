import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { TECH_ARTICLE_PAGE } from "./_constants";
import { getMetadata } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return getMetadata(lng);
}

interface TechArticlePageProps extends LanguageParams {}

export default async function TechArticlePage({
	params,
}: TechArticlePageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={TECH_ARTICLE_PAGE} />;
}
