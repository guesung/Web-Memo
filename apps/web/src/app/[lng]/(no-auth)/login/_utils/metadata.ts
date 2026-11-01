import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import type { Metadata } from "next";

export async function getLoginMetadata(lng: Language): Promise<Metadata> {
	const { t } = await getTranslation(lng);

	return {
		title: t("login.metadataTitle"),
		robots: { index: false, follow: false },
		alternates: { canonical: `${CONFIG.webUrl}/${lng}${PATHS.login}` },
	};
}
