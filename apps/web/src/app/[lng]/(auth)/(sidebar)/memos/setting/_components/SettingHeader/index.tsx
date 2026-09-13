"use server";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";

interface IFSettingHeaderProps extends LanguageType {}

/** 설정 화면의 제목 줄 */
export default async function SettingHeader({ lng }: IFSettingHeaderProps) {
	const { t } = await useTranslation(lng);

	return (
		<div className="mb-6 flex flex-col gap-1">
			<h1 className="text-xl font-semibold text-foreground">
				{t("setting.header")}
			</h1>
			<p className="text-sm text-muted-foreground">
				{t("setting.headerDescription")}
			</p>
		</div>
	);
}
