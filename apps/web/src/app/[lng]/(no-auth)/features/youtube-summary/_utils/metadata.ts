import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "유튜브 영상 AI 요약 | 웹 메모",
	description:
		"유튜브 영상을 AI로 빠르게 요약하세요. 긴 영상도 핵심만 쏙쏙 뽑아 시간을 절약할 수 있습니다. 무료 크롬 확장 프로그램으로 지금 바로 시작하세요.",
	keywords: [
		"유튜브 요약",
		"영상 요약",
		"AI 요약",
		"유튜브 AI",
		"동영상 요약",
		"youtube summary",
		"영상 핵심 정리",
	],
	alternates: {
		canonical: "https://web-memo.site/ko/features/youtube-summary",
		languages: {
			ko: "https://web-memo.site/ko/features/youtube-summary",
			en: "https://web-memo.site/en/features/youtube-summary",
		},
	},
	openGraph: {
		title: "유튜브 영상 AI 요약 | 웹 메모",
		description:
			"유튜브 영상을 AI로 빠르게 요약하세요. 긴 영상도 핵심만 쏙쏙 뽑아 시간을 절약할 수 있습니다.",
		images: ["/og-image.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "YouTube Video AI Summary | Web Memo",
	description:
		"Summarize YouTube videos instantly with AI. Extract key points from long videos and save time. Get started now with our free Chrome extension.",
	keywords: [
		"youtube summary",
		"video summary",
		"AI summary",
		"youtube AI",
		"video summarizer",
		"youtube transcript summary",
		"video key points",
	],
	alternates: {
		canonical: "https://web-memo.site/en/features/youtube-summary",
		languages: {
			ko: "https://web-memo.site/ko/features/youtube-summary",
			en: "https://web-memo.site/en/features/youtube-summary",
		},
	},
	openGraph: {
		title: "YouTube Video AI Summary | Web Memo",
		description:
			"Summarize YouTube videos instantly with AI. Extract key points from long videos and save time.",
		images: ["/og-image.png"],
		type: "website",
	},
};
