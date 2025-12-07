import { FeatureJsonLD } from "@src/app/_components";
import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";

import { Benefits, CTA, Hero, HowItWorks } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface SaveArticlesPageProps extends LanguageParams {}

export default async function SaveArticlesPage({
	params: { lng },
}: SaveArticlesPageProps) {
	return (
		<div className="min-h-screen overflow-hidden">
			<FeatureJsonLD lng={lng} feature="save-articles" />
			<HeaderMargin />
			<Hero lng={lng} />
			<Benefits lng={lng} />
			<HowItWorks lng={lng} />
			<CTA lng={lng} />
		</div>
	);
}
