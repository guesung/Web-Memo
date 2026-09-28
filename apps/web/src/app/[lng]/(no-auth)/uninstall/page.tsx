import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";

import { UninstallFeedbackForm } from "./_components";

/** 삭제 사유 설문 페이지의 메타데이터입니다. 색인 제외는 middleware가 처리합니다. */
export const generateMetadata = async ({ params }: LanguageParams) => {
	const { lng } = await params;
	const { t } = await useTranslation(lng);

	return { title: t("uninstall.metaTitle") };
};

/** 확장을 지운 사람이 이유를 남기는 설문 페이지입니다. */
const UninstallPage = async ({ params }: LanguageParams) => {
	const { lng } = await params;

	return (
		<main className="min-h-screen">
			<div className="flex min-h-screen items-center justify-center px-4 py-12">
				<div className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
					<UninstallFeedbackForm lng={lng} />
				</div>
			</div>
		</main>
	);
};

export default UninstallPage;
