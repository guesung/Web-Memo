import {
	BookOpen,
	Brain,
	Clock,
	FileText,
	Play,
	Sparkles,
	Zap,
} from "lucide-react";
import type { TLandingPageConfig } from "../../../_components";

/**
 * features/youtube-summary 소개 페이지 구성.
 * @description
 * 문구는 전부 번역 키에 있고, 여기서는 어떤 항목을 어떤 아이콘으로 어떤 순서에 두는지만
 * 정한다. 화면을 그리는 일은 `LandingPageTemplate`이 한다.
 */
export const YOUTUBE_SUMMARY_PAGE: TLandingPageConfig = {
	pageKey: "featuresYoutubeSummary",
	screenshotNumber: 3,
	benefits: [
		{ key: "timeSaving", icon: Clock },
		{ key: "aiPowered", icon: Brain },
		{ key: "transcript", icon: FileText },
		{ key: "instant", icon: Zap },
	],
	steps: [
		{ key: "step1", icon: Play },
		{ key: "step2", icon: Sparkles },
		{ key: "step3", icon: BookOpen },
	],
	relatedKeys: ["useCasesYoutubeNotes", "useCasesLearning", "featuresMemo"],
};
