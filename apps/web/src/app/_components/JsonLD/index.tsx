import { type Language, SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import Script from "next/script";

interface JsonLDProps {
	lng: Language;
}

const getJsonLd = (lng: Language) => ({
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: lng === "ko" ? "웹 메모" : "Web Memo",
	description:
		lng === "ko"
			? "웹페이지를 쉽게 저장하고 관리하세요"
			: "Store and manage web pages easily",
	url: process.env.NEXT_PUBLIC_WEB_URL || "https://web-memo.site",
	applicationCategory: "WebApplication",
	operatingSystem: "All",
	inLanguage: SUPPORTED_LANGUAGES,
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
	creator: {
		"@type": "Organization",
		name: "Web Memo",
	},
});

export default function JsonLD({ lng }: JsonLDProps) {
	const jsonLd = getJsonLd(lng);

	return (
		<Script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
			dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
		/>
	);
}
