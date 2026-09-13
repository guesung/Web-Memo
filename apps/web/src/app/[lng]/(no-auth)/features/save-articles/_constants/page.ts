import {
	Bookmark,
	Clock,
	ExternalLink,
	FolderHeart,
	Globe,
	Heart,
	List,
} from "lucide-react";
import type { TLandingPageConfig } from "../../../_components";

/**
 * features/save-articles 소개 페이지 구성.
 * @description
 * 문구는 전부 번역 키에 있고, 여기서는 어떤 항목을 어떤 아이콘으로 어떤 순서에 두는지만
 * 정한다. 화면을 그리는 일은 `LandingPageTemplate`이 한다.
 */
export const SAVE_ARTICLES_PAGE: TLandingPageConfig = {
	pageKey: "featuresSaveArticles",
	screenshotNumber: 4,
	benefits: [
		{ key: "oneClick", icon: Bookmark },
		{ key: "wishlist", icon: FolderHeart },
		{ key: "anywhere", icon: Globe },
		{ key: "readLater", icon: Clock },
	],
	steps: [
		{ key: "step1", icon: Heart },
		{ key: "step2", icon: List },
		{ key: "step3", icon: ExternalLink },
	],
	relatedKeys: ["useCasesTechArticle", "useCasesNewsReading", "featuresMemo"],
};
