import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { LEARNING_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface LearningPageProps extends LanguageParams {}

export default function LearningPage({ params: { lng } }: LearningPageProps) {
	return <LandingPageTemplate lng={lng} config={LEARNING_PAGE} />;
}
