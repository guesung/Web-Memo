import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { DEVELOPER_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

interface DeveloperPageProps extends LanguageParams {}

export default async function DeveloperPage({ params }: DeveloperPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={DEVELOPER_PAGE} />;
}
