import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";

import {
	Features,
	FinalCTA,
	Footer,
	Hero,
	HowItWorks,
	InteractiveDemo,
	QuestionAndAnswer,
	SocialProofBar,
	StatsSection,
	Testimonials,
	UseCases,
} from "./_components";
import { CHROME_STORE_STATS } from "./_constants";
import { getMemoCount, metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface IntroducePageProps extends LanguageParams {}

export default async function IntroducePage({
	params: { lng },
}: IntroducePageProps) {
	const memoCount = await getMemoCount();

	const stats = {
		...CHROME_STORE_STATS,
		memoCount,
	};

	return (
		<div className="min-h-screen overflow-hidden">
			<HeaderMargin />
			<Hero lng={lng} />
			<SocialProofBar lng={lng} />
			<InteractiveDemo lng={lng} />
			<Features lng={lng} />
			<StatsSection lng={lng} stats={stats} />
			<HowItWorks lng={lng} />
			<UseCases lng={lng} />
			<Testimonials lng={lng} />
			<QuestionAndAnswer lng={lng} />
			<FinalCTA lng={lng} />
			<Footer lng={lng} />
		</div>
	);
}
