import { type Language, SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import JsonLdScript from "../JsonLdScript";

const baseUrl = CONFIG.webUrl;

/**
 * SoftwareApplication 엔티티의 전역 식별자.
 *
 * @description
 * 이 스키마는 전 페이지 레이아웃에서 렌더되지만 별점 배지는 introduce 에만 보인다.
 * aggregateRating 을 여기 넣으면 배지가 없는 페이지까지 "보이지 않는 값"을 마크업하게
 * 되므로, 별점은 introduce 에서 같은 @id 로 별도 노드를 내보내 병합시킨다.
 */
export const SOFTWARE_APPLICATION_ID = `${baseUrl}/#software-application`;

interface JsonLDProps {
	lng: Language;
}

const getOrganizationSchema = (lng: Language) => ({
	"@context": "https://schema.org",
	"@type": "Organization",
	name: lng === "ko" ? "웹 메모" : "Web Memo",
	url: baseUrl,
	logo: `${baseUrl}/og-image.png`,
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
	"@id": SOFTWARE_APPLICATION_ID,
	name: lng === "ko" ? "웹 메모" : "Web Memo",
	description:
		lng === "ko"
			? "웹페이지를 읽으며 생각을 즉시 기록할 수 있는 크롬 확장 프로그램입니다. AI로 유튜브 영상을 요약하고, 아티클을 체계적으로 관리하세요."
			: "A Chrome extension that lets you instantly record your thoughts while reading web pages. Summarize YouTube videos with AI and manage articles systematically.",
	url: baseUrl,
	applicationCategory: "BrowserApplication",
	operatingSystem: "Chrome, Edge, Brave, Arc",
	inLanguage: SUPPORTED_LANGUAGES,
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
	author: {
		"@type": "Organization",
		name: "Web Memo",
	},
	downloadUrl:
		"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
	installUrl:
		"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
	screenshot: `${baseUrl}/og-image.png`,
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
			<JsonLdScript id="organization-jsonld" schema={organizationSchema} />
			<JsonLdScript
				id="software-application-jsonld"
				schema={softwareApplicationSchema}
			/>
		</>
	);
}
