import { PATHS } from "@web-memo/shared/constants";
import {
	Bookmark,
	Briefcase,
	Code,
	FileCode,
	GraduationCap,
	type LucideIcon,
	Newspaper,
	Pencil,
	Search,
	Sparkles,
	Youtube,
} from "lucide-react";

/**
 * 기능·유스케이스 소개 페이지 열 개의 공통 명부.
 * @description
 * 페이지끼리 서로를 "이어서 볼 것"으로 가리키려면 상대 페이지의 경로·아이콘·문구
 * 위치를 알아야 한다. 각 라우트가 그걸 제 파일에 적으면 같은 값이 열 벌로 흩어지고,
 * `use-cases/developer`·`use-cases/tech-article`처럼 아무도 안 가리키는 페이지가
 * 생겨도 드러나지 않는다. 그래서 한 표로 모은다.
 */

/** 소개 페이지 하나를 가리키는 키. 라우트와 1:1로 대응한다 */
export type TLandingPageKey =
	| "featuresMemo"
	| "featuresSaveArticles"
	| "featuresYoutubeSummary"
	| "useCasesDeveloper"
	| "useCasesJobHunting"
	| "useCasesLearning"
	| "useCasesNewsReading"
	| "useCasesResearch"
	| "useCasesTechArticle"
	| "useCasesYoutubeNotes";

/** 명부 한 줄 */
export type TLandingPageEntry = {
	/** `PATHS`의 값. lng 접두사는 쓰는 쪽이 붙인다 */
	path: string;
	/** 히어로 배지와 관련 링크 목록에서 함께 쓰는 아이콘 */
	icon: LucideIcon;
	/** 이 페이지 문구가 모여 있는 번역 키 앞부분 */
	translationPrefix: string;
};

export const LANDING_PAGE: Record<TLandingPageKey, TLandingPageEntry> = {
	featuresMemo: {
		path: PATHS.featuresMemo,
		icon: Pencil,
		translationPrefix: "features.memo",
	},
	featuresSaveArticles: {
		path: PATHS.featuresSaveArticles,
		icon: Bookmark,
		translationPrefix: "features.saveArticles",
	},
	featuresYoutubeSummary: {
		path: PATHS.featuresYoutubeSummary,
		icon: Sparkles,
		translationPrefix: "features.youtubeSummary",
	},
	useCasesDeveloper: {
		path: PATHS.useCasesDeveloper,
		icon: Code,
		translationPrefix: "useCases.developer",
	},
	useCasesJobHunting: {
		path: PATHS.useCasesJobHunting,
		icon: Briefcase,
		translationPrefix: "useCases.jobHunting",
	},
	useCasesLearning: {
		path: PATHS.useCasesLearning,
		icon: GraduationCap,
		translationPrefix: "useCases.learning",
	},
	useCasesNewsReading: {
		path: PATHS.useCasesNewsReading,
		icon: Newspaper,
		translationPrefix: "useCases.newsReading",
	},
	useCasesResearch: {
		path: PATHS.useCasesResearch,
		icon: Search,
		translationPrefix: "useCases.research",
	},
	useCasesTechArticle: {
		path: PATHS.useCasesTechArticle,
		icon: FileCode,
		translationPrefix: "useCases.techArticle",
	},
	useCasesYoutubeNotes: {
		path: PATHS.useCasesYoutubeNotes,
		icon: Youtube,
		translationPrefix: "useCases.youtubeNotes",
	},
};
