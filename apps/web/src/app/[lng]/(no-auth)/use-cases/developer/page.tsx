import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { DEVELOPER_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface DeveloperPageProps extends LanguageParams {}

export default function DeveloperPage({ params: { lng } }: DeveloperPageProps) {
	return <LandingPageTemplate lng={lng} config={DEVELOPER_PAGE} />;
}
