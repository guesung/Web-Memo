import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import JsonLdScript from "../JsonLdScript";

interface FeatureJsonLDProps {
	lng: Language;
	feature: "memo" | "save-articles";
}

const FEATURE_DATA = {
	memo: {
		ko: {
			name: "웹 메모",
			description:
				"웹페이지를 읽으면서 바로 메모할 수 있는 크롬 확장 프로그램입니다. 사이드 패널에서 편리하게 메모를 작성하고 관리하세요.",
		},
		en: {
			name: "Web Memo",
			description:
				"A Chrome extension that lets you take notes while browsing web pages. Conveniently write and manage memos in the side panel.",
		},
	},
	"save-articles": {
		ko: {
			name: "아티클 저장",
			description:
				"관심 있는 웹페이지를 저장하고 나중에 읽을 수 있습니다. 카테고리별로 체계적으로 관리하세요.",
		},
		en: {
			name: "Save Articles",
			description:
				"Save interesting web pages and read them later. Organize them systematically by categories.",
		},
	},
};

export default function FeatureJsonLD({ lng, feature }: FeatureJsonLDProps) {
	const data = FEATURE_DATA[feature][lng];
	const baseUrl = CONFIG.webUrl;

	const webPageSchema = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: data.name,
		description: data.description,
		url: `${baseUrl}/${lng}/features/${feature}`,
		isPartOf: {
			"@type": "WebSite",
			name: lng === "ko" ? "웹 메모" : "Web Memo",
			url: baseUrl,
		},
		mainEntity: {
			"@type": "SoftwareApplication",
			name: lng === "ko" ? "웹 메모" : "Web Memo",
			applicationCategory: "BrowserApplication",
			operatingSystem: "Chrome, Edge, Brave, Arc",
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
		},
	};

	return (
		<JsonLdScript id={`feature-${feature}-jsonld`} schema={webPageSchema} />
	);
}
