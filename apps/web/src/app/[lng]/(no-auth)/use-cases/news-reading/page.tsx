import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { NEWS_READING_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface NewsReadingPageProps extends LanguageParams {}

export default function NewsReadingPage({
	params: { lng },
}: NewsReadingPageProps) {
	return <LandingPageTemplate lng={lng} config={NEWS_READING_PAGE} />;
}
