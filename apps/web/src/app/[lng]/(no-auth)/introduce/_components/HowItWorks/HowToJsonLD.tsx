import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import Script from "next/script";

interface HowToJsonLDProps {
	lng: Language;
}

const HOW_TO_DATA = {
	ko: {
		name: "웹 메모 사용법",
		description:
			"웹 메모 크롬 확장 프로그램을 설치하고 사용하는 방법을 알아보세요. 3단계로 간단하게 시작할 수 있습니다.",
		steps: [
			{
				name: "확장 프로그램 설치",
				text: "Chrome 웹스토어에서 웹 메모 확장 프로그램을 설치하세요. 10초면 충분합니다.",
				url: "https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
			},
			{
				name: "사이드 패널 열기",
				text: "Alt+S (맥: Option+S) 단축키로 어디서든 사이드 패널을 빠르게 열 수 있습니다.",
			},
			{
				name: "저장하고 정리하기",
				text: "웹 콘텐츠를 메모하고 카테고리별로 체계적으로 관리하세요. 모든 메모는 자동으로 저장됩니다.",
			},
		],
		totalTime: "PT2M",
	},
	en: {
		name: "How to Use Web Memo",
		description:
			"Learn how to install and use the Web Memo Chrome extension. Get started in just 3 simple steps.",
		steps: [
			{
				name: "Install the Extension",
				text: "Install the Web Memo extension from the Chrome Web Store. It only takes 10 seconds.",
				url: "https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh",
			},
			{
				name: "Open the Side Panel",
				text: "Press Alt+S (Mac: Option+S) to quickly open the side panel from anywhere.",
			},
			{
				name: "Save and Organize",
				text: "Take notes on web content and organize them by categories. All memos are automatically saved.",
			},
		],
		totalTime: "PT2M",
	},
};

export default function HowToJsonLD({ lng }: HowToJsonLDProps) {
	const data = HOW_TO_DATA[lng];
	const baseUrl = CONFIG.webUrl;

	const howToSchema = {
		"@context": "https://schema.org",
		"@type": "HowTo",
		name: data.name,
		description: data.description,
		totalTime: data.totalTime,
		image: `${baseUrl}/og-image.png`,
		step: data.steps.map((step, index) => ({
			"@type": "HowToStep",
			position: index + 1,
			name: step.name,
			text: step.text,
			...(step.url && { url: step.url }),
		})),
	};

	return (
		<Script
			id="howto-jsonld"
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
			dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
		/>
	);
}
