import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { NEWS_READING_PAGE } from "./_constants";
import { getMetadata } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return getMetadata(lng);
}

interface NewsReadingPageProps extends LanguageParams {}

export default async function NewsReadingPage({
	params,
}: NewsReadingPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={NEWS_READING_PAGE} />;
}
