"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import { Button } from "@web-memo/ui";
import { useRouter } from "next/navigation";

import SettingRow from "./SettingRow";

interface IFSettingGuideProps extends LanguageType {}

/** 첫 사용 안내를 처음부터 다시 보는 설정 */
export default function SettingGuide({ lng }: IFSettingGuideProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();

	const handleRestartGuideClick = () => {
		LocalStorage.remove("guide");
		router.push(`/${lng}${PATHS.memos}`);
	};

	return (
		<SettingRow
			label={t("setting.guide")}
			description={t("setting.guideDescription")}
		>
			<Button
				variant="outline"
				className="max-sm:w-full"
				onClick={handleRestartGuideClick}
			>
				{t("setting.restartGuide")}
			</Button>
		</SettingRow>
	);
}
