import type { Language } from "@src/modules/i18n";
import Script from "next/script";

type FeatureType = "youtube-summary" | "memo" | "save-articles";

interface FeatureJsonLDProps {
	lng: Language;
	featureType: FeatureType;
}

const FEATURE_DATA = {
	"youtube-summary": {
		ko: {
			name: "유튜브 AI 요약",
			description:
				"유튜브 영상을 AI로 빠르게 요약하세요. 1시간짜리 영상도 몇 분 만에 핵심 내용을 파악할 수 있습니다.",
			keywords: ["유튜브 요약", "AI 요약", "영상 요약", "자막 요약"],
		},
		en: {
			name: "YouTube AI Summary",
			description:
				"Summarize YouTube videos quickly with AI. Understand the key points of a 1-hour video in just a few minutes.",
			keywords: ["youtube summary", "AI summary", "video summary", "caption summary"],
		},
	},
	memo: {
		ko: {
			name: "브라우저 메모",
			description:
				"웹페이지를 읽다가 떠오르는 생각을 즉시 기록하세요. 사이드 패널에서 간편하게 메모하고 체계적으로 관리할 수 있습니다.",
			keywords: ["웹 메모", "브라우저 메모", "사이드 패널 메모", "온라인 메모"],
		},
		en: {
			name: "Browser Memo",
			description:
				"Instantly record your thoughts while reading web pages. Take notes conveniently in the side panel and manage them systematically.",
			keywords: ["web memo", "browser memo", "side panel notes", "online notes"],
		},
	},
	"save-articles": {
		ko: {
			name: "아티클 저장",
			description:
				"관심 있는 아티클을 위시리스트에 저장하세요. 언제든지 다시 찾아볼 수 있습니다.",
			keywords: ["아티클 저장", "나중에 읽기", "위시리스트", "북마크"],
		},
		en: {
			name: "Save Articles",
			description:
				"Save interesting articles to your wishlist. You can revisit them anytime.",
			keywords: ["save articles", "read later", "wishlist", "bookmarks"],
		},
	},
};

export default function FeatureJsonLD({ lng, featureType }: FeatureJsonLDProps) {
	const data = FEATURE_DATA[featureType][lng];
	const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site";

	const webPageSchema = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: data.name,
		description: data.description,
		url: `${baseUrl}/${lng}/features/${featureType}`,
		inLanguage: lng === "ko" ? "ko-KR" : "en-US",
		isPartOf: {
			"@type": "WebSite",
			name: lng === "ko" ? "웹 메모" : "Web Memo",
			url: baseUrl,
		},
		keywords: data.keywords.join(", "),
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
		<Script
			id={`feature-${featureType}-jsonld`}
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
			dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
		/>
	);
}

export type { FeatureType };
