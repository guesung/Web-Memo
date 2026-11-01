import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { DEVELOPER_PAGE } from "./_constants";
import { getMetadata } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return getMetadata(lng);
}

interface DeveloperPageProps extends LanguageParams {}

export default async function DeveloperPage({ params }: DeveloperPageProps) {
	const { lng } = await params;

	return <LandingPageTemplate lng={lng} config={DEVELOPER_PAGE} />;
}
