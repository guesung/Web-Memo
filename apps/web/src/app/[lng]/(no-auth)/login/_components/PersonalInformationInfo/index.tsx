import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";

/**
 * 로그인 정보를 어디까지 쓰는지 알리는 문구입니다.
 * @description 계정을 만드는 자리라 무엇이 넘어가는지 버튼 바로 아래에서 밝힙니다.
 */
export default async function PersonalInformationInfo({
	lng,
}: IFPersonalInformationInfoProps) {
	const { t } = await useTranslation(lng);

	return (
		<p className="text-xs text-muted-foreground">
			{t("login.personalInformationInfo")}
		</p>
	);
}

/** PersonalInformationInfo의 props입니다. */
interface IFPersonalInformationInfoProps extends LanguageType {}
