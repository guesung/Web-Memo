import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import Script from "next/script";

interface FeatureJsonLDProps {
	lng: Language;
	feature: "youtube-summary" | "memo" | "save-articles";
}

const FEATURE_DATA = {
	"youtube-summary": {
		ko: {
			name: "유튜브 AI 요약",
			description:
				"AI가 유튜브 영상의 핵심 내용을 자동으로 요약해줍니다. 긴 영상도 빠르게 파악하고, 중요한 부분만 메모하세요.",
		},
		en: {
			name: "YouTube AI Summary",
			description:
				"AI automatically summarizes the key content of YouTube videos. Quickly grasp long videos and take notes on the important parts.",
		},
	},
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
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: "5.0",
				ratingCount: "33",
				bestRating: "5",
				worstRating: "1",
			},
		},
	};

	return (
		<Script
			id={`feature-${feature}-jsonld`}
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
			dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
		/>
	);
}
