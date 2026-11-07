import type { LanguageParams } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";

import { UnsubscribeCard } from "./_components";

/** 수신 거부 페이지의 메타데이터입니다. 색인 제외는 middleware가 처리합니다. */
export const generateMetadata = async ({ params }: LanguageParams) => {
	const { lng } = await params;
	const { t } = await getTranslation(lng);

	return { title: t("unsubscribe.metaTitle") };
};

/** 로그인 없이 메일 링크의 토큰으로 주간 메모 메일을 끄는 확인 페이지입니다. */
const UnsubscribePage = async ({ params, searchParams }: IFPageProps) => {
	const { lng } = await params;
	const { token } = await searchParams;

	return (
		<main className="min-h-screen">
			<div className="flex min-h-screen items-center justify-center px-4 py-12">
				<div className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
					<UnsubscribeCard lng={lng} token={token} />
				</div>
			</div>
		</main>
	);
};

export default UnsubscribePage;

/** 수신 거부 페이지의 props입니다. */
interface IFPageProps extends LanguageParams {
	searchParams: Promise<{ token?: string }>;
}
