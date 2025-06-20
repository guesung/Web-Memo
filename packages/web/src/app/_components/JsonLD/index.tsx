import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import Script from "next/script";

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: "Page Summary",
	description: {
		ko: "웹페이지를 쉽게 저장하고 관리하세요",
		en: "Store and manage web pages easily",
	},
	url: process.env.NEXT_PUBLIC_BASE_URL || "https://page-summary.com",
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
		name: "Page Summary Team",
	},
};

export default function JsonLD() {
	return (
		<Script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
		/>
	);
}
