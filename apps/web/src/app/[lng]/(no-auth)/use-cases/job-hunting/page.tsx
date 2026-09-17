import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { JOB_HUNTING_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface JobHuntingPageProps extends LanguageParams {}

export default function JobHuntingPage({
	params: { lng },
}: JobHuntingPageProps) {
	return <LandingPageTemplate lng={lng} config={JOB_HUNTING_PAGE} />;
}
