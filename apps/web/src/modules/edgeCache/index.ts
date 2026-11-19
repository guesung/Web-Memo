import { PATHS } from "@web-memo/shared/constants";

import { SUPPORTED_LANGUAGES } from "../i18n/constant";

// Cloudflare 엣지가 HTML을 캐시하는 공개 정적 페이지. 원본은 infra/oracle/edge-cache-paths.json이고
// 같은지는 테스트가 확인한다(Docker 빌드 컨텍스트에 infra가 없어 직접 import하지 않는다).
export const EDGE_CACHE_PATHS = [
	PATHS.introduce,
	PATHS.privacy,
	PATHS.compareChromeMemoExtensions,
	PATHS.featuresMemo,
	PATHS.featuresSaveArticles,
	PATHS.featuresYoutubeSummary,
	PATHS.useCasesDeveloper,
	PATHS.useCasesJobHunting,
	PATHS.useCasesLearning,
	PATHS.useCasesNewsReading,
	PATHS.useCasesResearch,
	PATHS.useCasesTechArticle,
	PATHS.useCasesYoutubeNotes,
];

const EDGE_CACHE_FULL_PATHS = new Set(
	SUPPORTED_LANGUAGES.flatMap((lng) =>
		EDGE_CACHE_PATHS.map((path) => `/${lng}${path}`),
	),
);

export function isEdgeCachePath(pathname: string) {
	return EDGE_CACHE_FULL_PATHS.has(pathname);
}
