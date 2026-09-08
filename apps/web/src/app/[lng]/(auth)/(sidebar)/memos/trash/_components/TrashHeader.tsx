"use server";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Label } from "@web-memo/ui";

interface TrashHeaderProps extends LanguageType {}

/** 휴지통 화면의 제목과 설명 */
export default async function TrashHeader({ lng }: TrashHeaderProps) {
	const { t } = await useTranslation(lng);

	return (
		<div className="flex flex-col items-center gap-2 py-10">
			<Label className="text-xl">{t("trash.title")}</Label>
			<p className="text-sm text-muted-foreground">{t("trash.description")}</p>
		</div>
	);
}
