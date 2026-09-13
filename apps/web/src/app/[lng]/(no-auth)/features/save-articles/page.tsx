import { FeatureJsonLD } from "@src/app/_components";
import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { SAVE_ARTICLES_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface SaveArticlesPageProps extends LanguageParams {}

export default function SaveArticlesPage({
	params: { lng },
}: SaveArticlesPageProps) {
	return (
		<LandingPageTemplate lng={lng} config={SAVE_ARTICLES_PAGE}>
			<FeatureJsonLD lng={lng} feature="save-articles" />
		</LandingPageTemplate>
	);
}
