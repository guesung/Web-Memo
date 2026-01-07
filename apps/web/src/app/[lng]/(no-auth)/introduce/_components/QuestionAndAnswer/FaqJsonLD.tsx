import type { Language } from "@src/modules/i18n";
import Script from "next/script";

import { FAQ_ITEMS } from "../../_constants";

interface FaqJsonLDProps {
	lng: Language;
}

const FAQ_DATA = {
	ko: {
		what_is: {
			question: "웹 메모가 뭔가요?",
			answer:
				"웹 메모는 간편 메모 및 요약 서비스입니다. 아티클을 읽거나, 유튜브 영상을 볼 때 '이거 한 줄로 누가 요약해주면 좋겠다..'싶으신 적 있으신가요? 그런 고민을 한 당신을 위해서 준비했습니다. 아티클을 읽으면서 단축키 하나로 사이드 패널을 여세요. 자동으로 아티클 혹은 유튜브 영상을 AI가 요약해줍니다. 그리고 메모를 작성하세요. 작성된 메모는 webmemo.site에서 언제든지 확인할 수 있어요.",
		},
		is_free: {
			question: "서비스는 무료인가요?",
			answer: "웹 메모 서비스는 전부 무료입니다.",
		},
		how_to_use: {
			question: "서비스는 어떻게 이용하나요?",
			answer:
				"웹 메모는 크롬 확장 프로그램을 설치하면 사용할 수 있습니다. 크롬 확장 프로그램을 설치하면 어느 사이트에서도 사이드 패널을 열어서 메모할 수 있어요.",
		},
		where_to_save: {
			question: "어디서 메모할 수 있나요?",
			answer:
				"웹 메모는 인터넷 어느 곳에서나 사용 가능합니다! 크롬 확장 프로그램을 설치하면 블로그와 뉴스 사이트에서 중요 내용을 메모하거나, 온라인 강의나 교육 자료 내용을 정리하거나, 유튜브 영상의 힌트나 인사이트를 기록할 수 있어요.",
		},
		ai_summary: {
			question: "AI 요약 기능은 어떻게 작동하나요?",
			answer:
				"AI 요약 기능은 현재 보고 있는 웹페이지나 유튜브 영상의 내용을 자동으로 분석하여 핵심 내용을 요약해줍니다. 유튜브의 경우 자막을 기반으로 영상 내용을 요약하며, 웹페이지의 경우 본문 텍스트를 분석합니다.",
		},
		data_sync: {
			question: "여러 기기에서 메모를 동기화할 수 있나요?",
			answer:
				"네! 웹 메모에 로그인하면 모든 메모가 클라우드에 자동 저장됩니다. PC, 노트북, 태블릿 등 어떤 기기에서든 동일한 계정으로 로그인하면 모든 메모를 확인하고 편집할 수 있어요.",
		},
		supported_browsers: {
			question: "어떤 브라우저에서 사용할 수 있나요?",
			answer:
				"현재 웹 메모는 Chrome 브라우저와 Chrome 기반 브라우저(Edge, Brave, Arc 등)에서 사용할 수 있습니다. Chrome 웹 스토어에서 확장 프로그램을 설치하면 바로 사용 가능합니다.",
		},
	},
	en: {
		what_is: {
			question: "What is Web Memo?",
			answer:
				"Web Memo is an intelligent note-taking service that revolutionizes internet browsing. Instantly memo important parts while reading articles. AI-powered automatic summarization of YouTube videos. Save interesting content to your wishlist.",
		},
		is_free: {
			question: "Is it free?",
			answer:
				"Yes! All core features of Web Memo are completely free: Unlimited memo storage, AI-powered content summarization, Category organization features, Wishlist management, YouTube caption summarization, Mobile app with data synchronization.",
		},
		how_to_use: {
			question: "How do I use the service?",
			answer:
				"You can use Web Memo by installing the Chrome extension. Once installed, you can open the side panel on any website to start taking notes.",
		},
		where_to_save: {
			question: "Where can I save memos?",
			answer:
				"Web Memo works everywhere on the internet! Install the Chrome extension and you can take notes on blogs and news sites, organize content from online courses, and record insights from YouTube videos.",
		},
		ai_summary: {
			question: "How does the AI summary feature work?",
			answer:
				"The AI summary feature automatically analyzes the content of the webpage or YouTube video you're viewing and summarizes the key points. For YouTube, it summarizes based on video captions, and for webpages, it analyzes the main text content.",
		},
		data_sync: {
			question: "Can I sync my memos across multiple devices?",
			answer:
				"Yes! When you log in to Web Memo, all your memos are automatically saved to the cloud. You can access and edit all your memos from any device by logging in with the same account.",
		},
		supported_browsers: {
			question: "Which browsers are supported?",
			answer:
				"Currently, Web Memo is available on Chrome and Chrome-based browsers (Edge, Brave, Arc, etc.). Simply install the extension from the Chrome Web Store to get started.",
		},
	},
};

export default function FaqJsonLD({ lng }: FaqJsonLDProps) {
	const faqData = FAQ_DATA[lng];

	const faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: FAQ_ITEMS.map((faqKey) => ({
			"@type": "Question",
			name: faqData[faqKey].question,
			acceptedAnswer: {
				"@type": "Answer",
				text: faqData[faqKey].answer,
			},
		})),
	};

	return (
		<Script
			id="faq-jsonld"
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data injection
			dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
		/>
	);
}
