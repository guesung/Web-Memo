import { JsonLdScript } from "@src/app/_components";

/** 화면에 표시하는 FAQ를 검색엔진에 동일하게 전달합니다. */
const FaqJsonLD = ({ items }: IFFaqJsonLDProps) => {
	const faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};

	return <JsonLdScript id="faq-jsonld" schema={faqSchema} />;
};

export default FaqJsonLD;

/** 화면과 공유하는 번역된 FAQ 목록입니다. */
interface IFFaqJsonLDProps {
	items: { question: string; answer: string }[];
}
