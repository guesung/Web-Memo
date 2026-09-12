import type { LanguageParams } from "@src/modules/i18n";

import { LandingPageTemplate } from "../../_components";
import { YOUTUBE_NOTES_PAGE } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface YoutubeNotesPageProps extends LanguageParams {}

export default function YoutubeNotesPage({
	params: { lng },
}: YoutubeNotesPageProps) {
	return <LandingPageTemplate lng={lng} config={YOUTUBE_NOTES_PAGE} />;
}
