import {
	DEFAULT_LANGUAGE,
	type Language,
	SUPPORTED_LANGUAGES,
} from "@src/modules/i18n";
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
 *
 * compare 는 한국어 본문만 있어서(/en 은 404) 싣는 언어를 ko 로 좁힌다. 언어를 적지
 * 않은 항목은 지원 언어 전부로 펼친다.
 */
const PRIORITY_BY_PREFIX: TIndexablePrefix[] = [
	{ prefix: "/features/", priority: 0.8, changeFrequency: "monthly" },
	{ prefix: "/use-cases/", priority: 0.7, changeFrequency: "monthly" },
	{
		prefix: "/compare/",
		priority: 0.8,
		changeFrequency: "monthly",
		languages: ["ko"],
	},
];

const STANDALONE_PATHS: TIndexablePath[] = [
	{ path: PATHS.introduce, priority: 1.0, changeFrequency: "weekly" },
	{ path: PATHS.privacy, priority: 0.3, changeFrequency: "yearly" },
];

const getIndexablePaths = () => {
	const prefixed = Object.values(PATHS).flatMap((path) => {
		const matched = PRIORITY_BY_PREFIX.find(({ prefix }) =>
			path.startsWith(prefix),
		);
		if (!matched) {
			return [];
		}

		return [
			{
				path,
				priority: matched.priority,
				changeFrequency: matched.changeFrequency,
				languages: matched.languages,
			},
		];
	});

	return [...STANDALONE_PATHS, ...prefixed];
};

/**
 * 한 경로의 hreflang 대응 집합.
 *
 * @description
 * Next 14의 sitemap alternates 는 self-reference 를 자동으로 넣어주지 않는다.
 * 자기 자신이 빠지면 hreflang 클러스터가 통째로 무시되므로 현재 로케일까지 전부
 * 직접 채운다. x-default 는 Accept-Language 를 안 보내는 크롤러(Googlebot)가
 * 어디로 가야 하는지 알려주는 폴백이라 기본 로케일로 건다. 기본 로케일이 없는
 * 경로(ko 전용)는 있는 언어로 건다. 없는 URL 을 가리키면 클러스터가 깨진다.
 */
const getLanguageAlternates = (
	path: string,
	languages: readonly Language[],
) => {
	const alternates = Object.fromEntries(
		languages.map((lng) => [lng, `${CONFIG.webUrl}/${lng}${path}`]),
	);
	const fallbackLanguage = languages.includes(DEFAULT_LANGUAGE)
		? DEFAULT_LANGUAGE
		: languages[0];

	return {
		...alternates,
		"x-default": `${CONFIG.webUrl}/${fallbackLanguage}${path}`,
	};
};

/** 실제 변경일 원천이 없는 lastModified는 생략하고 공개 URL과 언어 대응을 제공합니다. */
const sitemap = (): MetadataRoute.Sitemap => {
	return getIndexablePaths().flatMap(
		({ path, priority, changeFrequency, languages = SUPPORTED_LANGUAGES }) =>
			languages.map((lng) => ({
				url: `${CONFIG.webUrl}/${lng}${path}`,
				changeFrequency,
				priority,
				alternates: { languages: getLanguageAlternates(path, languages) },
			})),
	);
};

export default sitemap;

/** sitemap 에 싣는 경로 하나의 우선순위·갱신 주기·언어 */
type TIndexablePath = {
	path: string;
	priority: number;
	changeFrequency: "weekly" | "monthly" | "yearly";
	/** 이 경로가 존재하는 언어. 생략하면 지원 언어 전부 */
	languages?: readonly Language[];
};

/** 접두사로 묶인 경로들에 공통으로 붙는 설정 */
type TIndexablePrefix = Omit<TIndexablePath, "path"> & { prefix: string };
