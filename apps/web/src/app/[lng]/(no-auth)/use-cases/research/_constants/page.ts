import { Brain, FileText, FolderOpen, Link as LinkIcon } from "lucide-react";
import type { TLandingPageConfig } from "../../../_components";

/**
 * use-cases/research 소개 페이지 구성.
 * @description
 * 문구는 전부 번역 키에 있고, 여기서는 어떤 항목을 어떤 아이콘으로 어떤 순서에 두는지만
 * 정한다. 화면을 그리는 일은 `LandingPageTemplate`이 한다.
 */
export const RESEARCH_PAGE: TLandingPageConfig = {
	pageKey: "useCasesResearch",
	screenshotNumber: 3,
	benefits: [
		{ key: "capture", icon: FileText },
		{ key: "summarize", icon: Brain },
		{ key: "organize", icon: FolderOpen },
		{ key: "reference", icon: LinkIcon },
	],
	relatedKeys: ["useCasesTechArticle", "useCasesLearning", "featuresMemo"],
};
