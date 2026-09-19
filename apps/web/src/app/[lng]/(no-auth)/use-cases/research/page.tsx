import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { RESEARCH_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

interface ResearchPageProps extends LanguageParams {}

export default async function ResearchPage({ params }: ResearchPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={RESEARCH_PAGE} />;
}
