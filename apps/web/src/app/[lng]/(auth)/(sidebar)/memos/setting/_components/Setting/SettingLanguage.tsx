"use client";

import type { Language, LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";
import { useRouter } from "next/navigation";

import { useLanguage } from "../../_hooks";
import SettingRow from "./SettingRow";

interface IFSettingLanguageProps extends LanguageType {}

/** 화면에 쓰는 언어를 고르는 설정 */
export default function SettingLanguage({ lng }: IFSettingLanguageProps) {
	const { t } = useTranslation(lng);
	const { language, setLanguageRouter } = useLanguage();
	const router = useRouter();

	const handleLanguageChange = (value: Language) => {
		setLanguageRouter(value);
		router.refresh();
	};

	return (
		<SettingRow
			label={t("setting.language")}
			description={t("setting.languageDescription")}
		>
			<Select
				onValueChange={handleLanguageChange}
				value={language}
				aria-label={t("setting.selectLanguage")}
			>
				<SelectTrigger className="w-full sm:w-[180px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ko">한글</SelectItem>
					<SelectItem value="en">English</SelectItem>
				</SelectContent>
			</Select>
		</SettingRow>
	);
}
