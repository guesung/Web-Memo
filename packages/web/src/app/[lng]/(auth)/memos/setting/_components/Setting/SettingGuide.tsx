import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import { Button, Label } from "@web-memo/ui";
import { useRouter } from "next/navigation";

interface SettingGuideProps extends LanguageType {}

export default function SettingGuide({ lng }: SettingGuideProps) {
	const { t } = useTranslation(lng);

	const router = useRouter();

	const handleRestartGuide = () => {
		LocalStorage.remove("guide");
		router.push(PATHS.memos);
	};

	return (
		<div className="grid grid-cols-12">
			<Label className="col-span-4 grid place-items-center">
				{t("setting.guide")}
			</Label>
			<Button
				variant="outline"
				className="col-span-2"
				onClick={handleRestartGuide}
			>
				{t("setting.restartGuide")}
			</Button>
		</div>
	);
}
