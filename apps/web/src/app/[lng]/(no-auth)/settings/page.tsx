import type { LanguageParams } from "@src/modules/i18n";

import { SettingsContent } from "./_components";

/** 로그인 여부와 관계없이 일반·확장 설정을 제공하는 통합 설정 페이지입니다. */
const SettingsPage = async (props: LanguageParams) => {
	const { lng } = await props.params;

	return <SettingsContent lng={lng} />;
};

export default SettingsPage;
