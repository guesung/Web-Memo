import type { LanguageParams } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { permanentRedirect } from "next/navigation";

/** 종료된 유튜브 요약 소개 URL을 현재 제공하는 유튜브 메모 페이지로 보냅니다. */
const YoutubeSummaryPage = async ({ params }: LanguageParams) => {
	const { lng } = await params;

	return permanentRedirect(`/${lng}${PATHS.useCasesYoutubeNotes}`);
};

export default YoutubeSummaryPage;
