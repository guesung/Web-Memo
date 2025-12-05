import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "웹 메모 | 소개 ",
	description:
		"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록할 수 있는 서비스입니다. 아티클을 읽다가 떠오른 아이디어나 중요한 내용을 사이드 패널에서 바로 메모하고 체계적으로 관리하세요.",
	alternates: {
		canonical: "https://web-memo.site/ko/introduce",
		languages: {
			ko: "https://web-memo.site/ko/introduce",
			en: "https://web-memo.site/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

export const metadataEnglish: Metadata = {
	title: "Web Memo | Introduce",
	description:
		"Web Memo is a service that lets you instantly record your thoughts while reading web pages. Save ideas and important content that come to mind while reading articles through the side panel and manage them systematically.",
	alternates: {
		canonical: "https://web-memo.site/en/introduce",
		languages: {
			ko: "https://web-memo.site/ko/introduce",
			en: "https://web-memo.site/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};
