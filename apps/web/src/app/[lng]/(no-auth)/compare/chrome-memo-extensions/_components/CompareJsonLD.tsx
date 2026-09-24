import { JsonLdScript } from "@src/app/_components";
import { CONFIG } from "@web-memo/env";
import {
	COMPARE_LAST_CHECKED_DATE,
	COMPARE_PAGE_COPY,
	COMPARE_PAGE_PATH,
} from "../_constants";

/**
 * 비교 페이지를 Article 하나로 검색엔진에 전달한다.
 * @description
 * 경쟁 제품은 SoftwareApplication으로 마크업하지 않는다. 남의 제품 정보를 우리가
 * 구조화 데이터로 단언하게 되기 때문이다. 발행일은 따로 기록한 날이 없어 마지막
 * 확인일과 같게 둔다.
 */
const CompareJsonLD = () => {
	const canonicalUrl = `${CONFIG.webUrl}/ko${COMPARE_PAGE_PATH}`;
	const organization = {
		"@type": "Organization",
		name: "웹 메모",
		url: CONFIG.webUrl,
		logo: `${CONFIG.webUrl}/og-image.png`,
	};

	const articleSchema = {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: COMPARE_PAGE_COPY.hero.title,
		image: `${CONFIG.webUrl}/og-image.png`,
		datePublished: COMPARE_LAST_CHECKED_DATE,
		dateModified: COMPARE_LAST_CHECKED_DATE,
		inLanguage: "ko",
		author: organization,
		publisher: organization,
		mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
	};

	return <JsonLdScript id="compare-article-jsonld" schema={articleSchema} />;
};

export default CompareJsonLD;
