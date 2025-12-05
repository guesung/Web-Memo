import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";

import { Benefits, CTA, Hero, HowItWorks } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface YoutubeSummaryPageProps extends LanguageParams {}

export default async function YoutubeSummaryPage({
	params: { lng },
}: YoutubeSummaryPageProps) {
	return (
		<div className="min-h-screen overflow-hidden">
			<HeaderMargin />
			<Hero lng={lng} />
			<Benefits lng={lng} />
			<HowItWorks lng={lng} />
			<CTA lng={lng} />
		</div>
	);
}
