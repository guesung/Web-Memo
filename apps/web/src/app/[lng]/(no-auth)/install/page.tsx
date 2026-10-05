import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import type { Metadata } from "next";

import { InstallGuide } from "./_components";

export async function generateMetadata({
	params,
}: LanguageParams): Promise<Metadata> {
	const { lng } = await params;
	const { t } = await getTranslation(lng);

	return {
		title: t("installGuide.metadata.title"),
		description: t("installGuide.metadata.description"),
		robots: { index: false, follow: false },
	};
}

export default async function InstallPage({
	params,
	searchParams,
}: InstallPageProps) {
	const { lng } = await params;
	const { ext_cid: extensionClientId } = await searchParams;
	const extCid = Array.isArray(extensionClientId)
		? extensionClientId[0]
		: extensionClientId;

	return (
		<>
			<HeaderMargin />
			<InstallGuide lng={lng} extCid={extCid} />
		</>
	);
}

interface InstallPageProps extends LanguageParams {
	searchParams: Promise<{ ext_cid?: string | string[] }>;
}
