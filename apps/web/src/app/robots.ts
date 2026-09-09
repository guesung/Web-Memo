import { CONFIG } from "@web-memo/env";
import type { MetadataRoute } from "next";

/**
 * @description
 * 로그인·메모·어드민은 예전에 여기서 Disallow 했는데, 크롤을 막으면 페이지의 noindex 를
 * 읽지 못해 외부 링크만으로 URL 이 색인에 남는다. 색인에서 빼는 일은 각 라우트의
 * NOINDEX_METADATA 가 맡고, 여기서는 크롤러가 그 noindex 를 읽을 수 있게 열어둔다.
 *
 * 남긴 Disallow 는 애초에 HTML 이 아니거나(`/api/`) 검색에 노출될 일이 없는 경로다.
 */
export default function robots(): MetadataRoute.Robots {
	const baseUrl = CONFIG.webUrl;

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/private/", "/api/", "/auth/"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
