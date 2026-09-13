import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Alert, AlertDescription } from "@web-memo/ui";
import { CircleAlert } from "lucide-react";

/**
 * 로그인이 실패한 채 돌아온 사람에게 보여주는 안내입니다.
 * @description 제공자 화면에서 취소하거나 실패하면 아무 말 없이 로그인 화면으로 돌아와
 * 무엇이 잘못됐는지 알 수 없습니다. 원문 에러는 사용자가 할 수 있는 일을 알려주지 않으므로
 * 노출하지 않고 다시 시도하라는 한 줄만 남깁니다.
 */
export default async function LoginErrorAlert({ lng }: IFLoginErrorAlertProps) {
	const { t } = await useTranslation(lng);

	return (
		<Alert variant="destructive">
			<CircleAlert className="h-4 w-4" />
			<AlertDescription>{t("login.errorAlert")}</AlertDescription>
		</Alert>
	);
}

/** LoginErrorAlert의 props입니다. */
interface IFLoginErrorAlertProps extends LanguageType {}
