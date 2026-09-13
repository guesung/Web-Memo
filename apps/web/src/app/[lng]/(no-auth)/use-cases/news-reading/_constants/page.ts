import {
	FolderOpen,
	Highlighter,
	Link as LinkIcon,
	Sparkles,
} from "lucide-react";
import type { TLandingPageConfig } from "../../../_components";

/**
 * use-cases/news-reading 소개 페이지 구성.
 * @description
 * 문구는 전부 번역 키에 있고, 여기서는 어떤 항목을 어떤 아이콘으로 어떤 순서에 두는지만
 * 정한다. 화면을 그리는 일은 `LandingPageTemplate`이 한다.
 */
export const NEWS_READING_PAGE: TLandingPageConfig = {
	pageKey: "useCasesNewsReading",
	screenshotNumber: 2,
	benefits: [
		{ key: "highlight", icon: Highlighter },
		{ key: "aiSummary", icon: Sparkles },
		{ key: "categorize", icon: FolderOpen },
		{ key: "source", icon: LinkIcon },
	],
	relatedKeys: [
		"useCasesTechArticle",
		"useCasesResearch",
		"featuresSaveArticles",
	],
};
