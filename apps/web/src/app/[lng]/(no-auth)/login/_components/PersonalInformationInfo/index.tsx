import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Lock, Shield, Sparkles } from "lucide-react";

interface PersonalInformationInfoProps extends LanguageType {}

export default async function PersonalInformationInfo({
	lng,
}: PersonalInformationInfoProps) {
	const { t } = await useTranslation(lng);
	return (
		<footer className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-4 px-4">
			<div className="flex items-center justify-center gap-6 text-muted-foreground">
				<div className="flex items-center gap-1.5 text-xs">
					<Shield className="w-3.5 h-3.5" />
					<span>{t("login.trustSignal.secure")}</span>
				</div>
				<div className="flex items-center gap-1.5 text-xs">
					<Lock className="w-3.5 h-3.5" />
					<span>{t("login.trustSignal.private")}</span>
				</div>
				<div className="flex items-center gap-1.5 text-xs">
					<Sparkles className="w-3.5 h-3.5" />
					<span>{t("login.trustSignal.free")}</span>
				</div>
			</div>
			<p className="text-xs text-muted-foreground text-center max-w-md">
				{t("login.personalInformationInfo")}
			</p>
		</footer>
	);
}
