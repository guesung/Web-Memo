import type { LanguageParams } from "@src/modules/i18n";

import { CompareContent } from "./_components";
import { createComparisonMetadata, getComparisonContent } from "./_utils";

export const generateMetadata = async ({ params }: LanguageParams) => {
	const { lng } = await params;
	return createComparisonMetadata(lng);
};

const CompareChromeMemoExtensionsPage = async ({ params }: LanguageParams) => {
	const { lng } = await params;
	const content = await getComparisonContent(lng);

	return <CompareContent lng={lng} content={content} />;
};

export default CompareChromeMemoExtensionsPage;
