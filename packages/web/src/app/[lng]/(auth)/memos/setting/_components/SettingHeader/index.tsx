"use server";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Label } from "@web-memo/ui";

interface SettingHeaderProps extends LanguageType {}

export default async function SettingHeader({ lng }: SettingHeaderProps) {
	const { t } = await useTranslation(lng);
	return (
		<Label className="flex justify-center py-10 text-xl">
			{t("setting.header")}
		</Label>
	);
}
