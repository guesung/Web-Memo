import { FeatureJsonLD } from "@src/app/_components";
import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { YOUTUBE_SUMMARY_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface YoutubeSummaryPageProps extends LanguageParams {}

export default function YoutubeSummaryPage({
	params: { lng },
}: YoutubeSummaryPageProps) {
	return (
		<LandingPageTemplate lng={lng} config={YOUTUBE_SUMMARY_PAGE}>
			<FeatureJsonLD lng={lng} feature="youtube-summary" />
		</LandingPageTemplate>
	);
}
