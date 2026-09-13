import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { RESEARCH_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface ResearchPageProps extends LanguageParams {}

export default function ResearchPage({ params: { lng } }: ResearchPageProps) {
	return <LandingPageTemplate lng={lng} config={RESEARCH_PAGE} />;
}
