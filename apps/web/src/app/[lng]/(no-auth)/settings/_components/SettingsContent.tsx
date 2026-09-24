"use client";

import SettingLanguage from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingLanguage";
import SettingSection from "@src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Setting/SettingSection";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Toaster } from "@web-memo/ui";

import { AccountGuide, AccountSettings } from "./AccountSettings";
import { ExtensionSettings } from "./ExtensionSettings";

/** 웹과 확장 설정을 목적·적용 범위별로 나누어 표시합니다. */
export const SettingsContent = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);

	return (
		<main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-20 md:px-6">
			<header className="mb-6 space-y-1">
				<h1 className="text-xl font-semibold">{t("setting.header")}</h1>
				<p className="text-sm text-muted-foreground">
					{t("setting.unified.description")}
				</p>
			</header>
			<div className="grid gap-4">
				<SettingSection
					title={t("setting.sectionGeneral")}
					description={t("setting.unified.generalScope")}
				>
					<SettingLanguage lng={props.lng} />
					<AccountGuide lng={props.lng} />
				</SettingSection>
				<AccountSettings lng={props.lng} />
				<ExtensionSettings lng={props.lng} />
			</div>
			<Toaster />
		</main>
	);
};
