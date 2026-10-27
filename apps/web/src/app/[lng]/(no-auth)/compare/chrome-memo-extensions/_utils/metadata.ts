import type { Language } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { createPublicPageMetadata } from "../../../_utils";
import { COMPARE_LAST_CHECKED_DATE, COMPARE_PAGE_PATH } from "../_constants";

export const createComparisonMetadata = async (lng: Language) => {
	const { t } = await getTranslation(lng);
	const prefix = "compareChromeMemoExtensions.metadata";

	return createPublicPageMetadata({
		language: lng,
		path: COMPARE_PAGE_PATH,
		title: t(`${prefix}.title`),
		description: t(`${prefix}.description`, {
			date: COMPARE_LAST_CHECKED_DATE,
		}),
	});
};
