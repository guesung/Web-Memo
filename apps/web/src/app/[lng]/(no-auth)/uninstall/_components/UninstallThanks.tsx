import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Check } from "lucide-react";

/** 삭제 사유를 보낸 뒤 같은 카드 안에서 보여주는 감사 화면입니다. */
const UninstallThanks = ({ lng }: IFUninstallThanksProps) => {
	const { t } = useTranslation(lng);

	return (
		<div className="flex animate-fade-in flex-col gap-3">
			<Check className="text-primary" size={48} aria-hidden="true" />

			<h1 className="text-2xl font-bold text-foreground">
				{t("uninstall.success.title")}
			</h1>
			<p className="text-sm text-muted-foreground">
				{t("uninstall.success.description")}
			</p>
		</div>
	);
};

export default UninstallThanks;

/** UninstallThanks의 props입니다. */
interface IFUninstallThanksProps extends LanguageType {}
