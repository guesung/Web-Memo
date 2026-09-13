import { FeatureJsonLD } from "@src/app/_components";
import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { MEMO_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface MemoPageProps extends LanguageParams {}

export default function MemoPage({ params: { lng } }: MemoPageProps) {
	return (
		<LandingPageTemplate lng={lng} config={MEMO_PAGE}>
			<FeatureJsonLD lng={lng} feature="memo" />
		</LandingPageTemplate>
	);
}
