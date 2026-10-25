import { JsonLdScript } from "@src/app/_components";
import type { Language } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";

/** 화면과 공유하는 사용 단계로 HowTo 구조화 데이터를 렌더링합니다. */
const HowToJsonLD = ({ lng, steps }: IFHowToJsonLDProps) => {
	const data = HOW_TO_DATA[lng];
	const howToSchema = {
		"@context": "https://schema.org",
		"@type": "HowTo",
		name: data.name,
		description: data.description,
		totalTime: data.totalTime,
		image: `${CONFIG.webUrl}/og-image.png`,
		step: steps.map((step, index) => ({
			"@type": "HowToStep",
			position: index + 1,
			name: step.title,
			text: step.description,
			...(index === 0 && { url: EXTERNAL_LINK.chromeWebStoreListing }),
		})),
	};

	return <JsonLdScript id="howto-jsonld" schema={howToSchema} />;
};

export default HowToJsonLD;

/** 검색엔진에만 제공하는 사용법 문서의 메타데이터입니다. */
const HOW_TO_DATA = {
	ko: {
		name: "웹 메모 사용법",
		description:
			"웹 메모 크롬 확장 프로그램을 설치하고 사용하는 방법을 알아보세요. 3단계로 간단하게 시작할 수 있습니다.",
		totalTime: "PT2M",
	},
	en: {
		name: "How to Use Web Memo",
		description:
			"Learn how to install and use the Web Memo Chrome extension. Get started in just 3 simple steps.",
		totalTime: "PT2M",
	},
};

/** 화면에서 번역한 사용 단계와 문서 언어입니다. */
interface IFHowToJsonLDProps {
	lng: Language;
	steps: { title: string; description: string }[];
}
