import { JsonLdScript } from "@src/app/_components";
import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";

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
				text: "Chrome 웹스토어에서 10초 만에",
				url: EXTERNAL_LINK.chromeWebStoreListing,
			},
			{
				name: "로그인하고 사이드 패널 열기",
				text: "로그인 후 Alt+S(맥: Option+S) 단축키로 어디서든 빠르게 열 수 있어요",
			},
			{
				name: "메모 자동 저장",
				text: "메모를 입력하면 자동으로 저장되고, 웹에서 언제든 다시 확인할 수 있어요",
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
				text: "10 seconds from the Chrome Web Store",
				url: EXTERNAL_LINK.chromeWebStoreListing,
			},
			{
				name: "Sign In & Open the Side Panel",
				text: "After signing in, press Alt+S (Mac: Option+S) to open it instantly, anywhere",
			},
			{
				name: "Memos Save Automatically",
				text: "Enter a memo and it saves automatically — revisit it anytime on the web",
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

	return <JsonLdScript id="howto-jsonld" schema={howToSchema} />;
}
