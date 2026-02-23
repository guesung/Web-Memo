import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";

import { Benefits, CTA, Hero } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface DeveloperPageProps extends LanguageParams {}

export default async function DeveloperPage({
	params: { lng },
}: DeveloperPageProps) {
	return (
		<div className="min-h-screen overflow-hidden">
			<HeaderMargin />
			<Hero lng={lng} />
			<Benefits lng={lng} />
			<CTA lng={lng} />
		</div>
	);
}
