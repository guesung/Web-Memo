import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { LEARNING_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

interface LearningPageProps extends LanguageParams {}

export default async function LearningPage({ params }: LearningPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={LEARNING_PAGE} />;
}
