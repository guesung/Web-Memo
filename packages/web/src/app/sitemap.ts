import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://web-memo.site";
	const lastModified = new Date().toISOString();

	const pathConfigs = [
		{
			path: PATHS.introduce,
			priority: 0.9,
			changeFrequency: "weekly" as const,
		},
		{ path: PATHS.update, priority: 0.6, changeFrequency: "monthly" as const },
		{
			path: PATHS.featuresYoutubeSummary,
			priority: 0.8,
			changeFrequency: "monthly" as const,
		},
		{
			path: PATHS.featuresMemo,
			priority: 0.8,
			changeFrequency: "monthly" as const,
		},
		{
			path: PATHS.featuresSaveArticles,
			priority: 0.8,
			changeFrequency: "monthly" as const,
		},
		{
			path: PATHS.useCasesResearch,
			priority: 0.7,
			changeFrequency: "monthly" as const,
		},
		{
			path: PATHS.useCasesLearning,
			priority: 0.7,
			changeFrequency: "monthly" as const,
		},
	];

	const sitemapEntries: MetadataRoute.Sitemap = [];

	SUPPORTED_LANGUAGES.forEach((lng) => {
		pathConfigs.forEach(({ path, priority, changeFrequency }) => {
			if (path === PATHS.kakaoLogin || path === PATHS.googleLogin) {
				return;
			}

			if (path === PATHS.error) {
				return;
			}

			sitemapEntries.push({
				url: `${baseUrl}/${lng}${path}`,
				lastModified,
				changeFrequency,
				priority,
			});
		});
	});

	return sitemapEntries;
}
