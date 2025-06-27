import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL || "https://page-summary.com";
	const lastModified = new Date().toISOString();

	const languageUrls = SUPPORTED_LANGUAGES.map((lng) => ({
		url: `${baseUrl}/${lng}`,
		lastModified,
		changeFrequency: "daily" as const,
		priority: 1,
	}));

	const memoUrls = SUPPORTED_LANGUAGES.map((lng) => ({
		url: `${baseUrl}/${lng}/memos`,
		lastModified,
		changeFrequency: "always" as const,
		priority: 0.8,
	}));

	return [...languageUrls, ...memoUrls];
}
