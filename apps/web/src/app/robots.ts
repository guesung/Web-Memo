import { CONFIG } from "@web-memo/env";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = CONFIG.webUrl;

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/private/", "/*/memos/", "/*/admin/", "/*/login"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
