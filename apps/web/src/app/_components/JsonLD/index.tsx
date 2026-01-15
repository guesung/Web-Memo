import { type Language, SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import Script from "next/script";

interface JsonLDProps {
	lng: Language;
}

const getOrganizationSchema = (lng: Language) => ({
	"@context": "https://schema.org",
	"@type": "Organization",
	name: lng === "ko" ? "웹 메모" : "Web Memo",
	url: process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site",
	logo: `${process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site"}/og-image.png`,
	sameAs: [
		"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
	],
	contactPoint: {
		"@type": "ContactPoint",
		email: "gueit214@naver.com",
		contactType: "customer service",
		availableLanguage: ["Korean", "English"],
	},
});

const getSoftwareApplicationSchema = (lng: Language) => ({
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: lng === "ko" ? "웹 메모" : "Web Memo",
	description:
		lng === "ko"
			? "웹페이지를 읽으며 생각을 즉시 기록할 수 있는 크롬 확장 프로그램입니다. AI로 유튜브 영상을 요약하고, 아티클을 체계적으로 관리하세요."
			: "A Chrome extension that lets you instantly record your thoughts while reading web pages. Summarize YouTube videos with AI and manage articles systematically.",
	url: process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site",
	applicationCategory: "BrowserApplication",
	operatingSystem: "Chrome, Edge, Brave, Arc",
	inLanguage: SUPPORTED_LANGUAGES,
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
	author: {
		"@type": "Organization",
		name: "Web Memo",
	},
	downloadUrl:
		"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
	installUrl:
		"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
	screenshot: `${process.env.NEXT_PUBLIC_WEB_URL || "https://webmemo.site"}/og-image.png`,
	featureList:
		lng === "ko"
			? [
					"웹페이지 메모",
					"AI 유튜브 요약",
					"위시리스트",
					"카테고리 관리",
					"클라우드 동기화",
				]
			: [
					"Web page memos",
					"AI YouTube summary",
					"Wishlist",
					"Category management",
					"Cloud sync",
				],
});

export default function JsonLD({ lng }: JsonLDProps) {
	const organizationSchema = getOrganizationSchema(lng);
	const softwareApplicationSchema = getSoftwareApplicationSchema(lng);

	return (
		<>
			<Script
				id="organization-jsonld"
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
				dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
			/>
			<Script
				id="software-application-jsonld"
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(softwareApplicationSchema),
				}}
			/>
		</>
	);
}
