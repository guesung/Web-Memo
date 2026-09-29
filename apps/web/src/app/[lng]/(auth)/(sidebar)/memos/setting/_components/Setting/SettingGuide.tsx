"use client";

import { useGetExtensionManifest } from "@src/hooks";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { EXTERNAL_LINK, PATHS } from "@web-memo/shared/constants";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import { Button } from "@web-memo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import SettingRow from "./SettingRow";

interface IFSettingGuideProps extends LanguageType {}

/** 첫 사용 안내를 처음부터 다시 보는 설정 */
export default function SettingGuide({ lng }: IFSettingGuideProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const manifest = useGetExtensionManifest();
	const [isExtensionNoticeVisible, setIsExtensionNoticeVisible] =
		useState(false);

	const handleRestartGuideClick = () => {
		// 확장이 없으면 가이드가 시작되지 않으므로, 이동하지 않고 사유를 알린다.
		if (manifest === "NOT_INSTALLED") {
			setIsExtensionNoticeVisible(true);
			return;
		}

		LocalStorage.remove("guide");
		router.push(`/${lng}${PATHS.memos}`);
	};

	return (
		<div className="space-y-3">
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
			{isExtensionNoticeVisible && (
				<output className="block rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
					{t("setting.guideExtensionNotDetected")}{" "}
					<a
						href={EXTERNAL_LINK.chromeWebStoreListing}
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>
						{t("setting.installExtension")}
					</a>
				</output>
			)}
		</div>
	);
}
