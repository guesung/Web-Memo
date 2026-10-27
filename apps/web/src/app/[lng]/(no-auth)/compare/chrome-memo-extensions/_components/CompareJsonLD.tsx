import { JsonLdScript } from "@src/app/_components";
import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import {
	COMPARE_ARTICLE_MODIFIED_DATE,
	COMPARE_ARTICLE_PUBLISHED_DATE,
	COMPARE_PAGE_PATH,
} from "../_constants";

interface CompareJsonLDProps {
	lng: Language;
	title: string;
	brandName: string;
}

/** One localized Article for the comparison page. */
const CompareJsonLD = ({ lng, title, brandName }: CompareJsonLDProps) => {
	const canonicalUrl = `${CONFIG.webUrl}/${lng}${COMPARE_PAGE_PATH}`;
	const organization = {
		"@type": "Organization",
		name: brandName,
		url: CONFIG.webUrl,
		logo: `${CONFIG.webUrl}/og-image.png`,
	};

	const articleSchema = {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: title,
		image: `${CONFIG.webUrl}/og-image.png`,
		datePublished: COMPARE_ARTICLE_PUBLISHED_DATE[lng],
		dateModified: COMPARE_ARTICLE_MODIFIED_DATE,
		inLanguage: lng,
		author: organization,
		publisher: organization,
		mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
	};

	return <JsonLdScript id="compare-article-jsonld" schema={articleSchema} />;
};

export default CompareJsonLD;
