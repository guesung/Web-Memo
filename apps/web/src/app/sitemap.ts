import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import type { MetadataRoute } from "next";

/**
 * 색인 대상 경로와 우선순위.
 *
 * @description
 * 예전에는 경로를 손으로 나열해서, 라우트를 추가할 때마다 sitemap 등록을 잊었다.
 * 실제로 use-cases 7개 중 4개만 올라가 있었다. 이제 PATHS 를 접두사로 훑어 features·
 * use-cases 를 자동으로 걷고, 나머지 단건만 명시한다. PATHS 에 항목을 추가하면
 * sitemap 에도 자동으로 실린다.
 *
 * noindex 인 경로(login·uninstall·memos·admin)는 애초에 여기 걸리지 않도록
 * 접두사 규칙 밖에 둔다.
 */
const PRIORITY_BY_PREFIX = [
	{ prefix: "/features/", priority: 0.8, changeFrequency: "monthly" as const },
	{ prefix: "/use-cases/", priority: 0.7, changeFrequency: "monthly" as const },
];

const STANDALONE_PATHS = [
	{ path: PATHS.introduce, priority: 1.0, changeFrequency: "weekly" as const },
	{ path: PATHS.update, priority: 0.6, changeFrequency: "monthly" as const },
	{ path: PATHS.privacy, priority: 0.3, changeFrequency: "yearly" as const },
];

function getIndexablePaths() {
	const prefixed = Object.values(PATHS).flatMap((path) => {
		const matched = PRIORITY_BY_PREFIX.find(({ prefix }) =>
			path.startsWith(prefix),
		);
		if (!matched) return [];

		return [
			{
				path,
				priority: matched.priority,
				changeFrequency: matched.changeFrequency,
			},
		];
	});

	return [...STANDALONE_PATHS, ...prefixed];
}

/**
 * 한 경로의 hreflang 대응 집합.
 *
 * @description
 * Next 14의 sitemap alternates 는 self-reference 를 자동으로 넣어주지 않는다.
 * 자기 자신이 빠지면 hreflang 클러스터가 통째로 무시되므로 현재 로케일까지 전부
 * 직접 채운다. x-default 는 Accept-Language 를 안 보내는 크롤러(Googlebot)가
 * 어디로 가야 하는지 알려주는 폴백이라 기본 로케일로 건다.
 */
function getLanguageAlternates(path: string) {
	const languages = Object.fromEntries(
		SUPPORTED_LANGUAGES.map((lng) => [lng, `${CONFIG.webUrl}/${lng}${path}`]),
	);

	return {
		...languages,
		"x-default": `${CONFIG.webUrl}/${DEFAULT_LANGUAGE}${path}`,
	};
}

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date().toISOString();

	return getIndexablePaths().flatMap(({ path, priority, changeFrequency }) =>
		SUPPORTED_LANGUAGES.map((lng) => ({
			url: `${CONFIG.webUrl}/${lng}${path}`,
			lastModified,
			changeFrequency,
			priority,
			alternates: { languages: getLanguageAlternates(path) },
		})),
	);
}
