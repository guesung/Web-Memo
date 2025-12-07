import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site";

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/private/", "/*/memos/", "/*/admin/", "/*/login"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
		host: baseUrl,
	};
}
