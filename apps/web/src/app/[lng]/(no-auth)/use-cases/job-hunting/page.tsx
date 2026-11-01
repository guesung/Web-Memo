import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { JOB_HUNTING_PAGE } from "./_constants";
import { getMetadata } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return getMetadata(lng);
}

interface JobHuntingPageProps extends LanguageParams {}

export default async function JobHuntingPage({ params }: JobHuntingPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={JOB_HUNTING_PAGE} />;
}
