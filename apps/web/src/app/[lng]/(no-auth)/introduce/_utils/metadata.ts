import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "웹 메모 - 웹페이지 읽으며 바로 메모하는 크롬 확장",
	description:
		"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록하는 크롬 확장 프로그램입니다. 사이드 패널에서 아티클을 바로 메모하고, 유튜브 영상을 AI로 요약하며, 저장한 메모를 체계적으로 관리하세요. 무료로 시작하세요.",
	alternates: {
		canonical: "https://webmemo.xyz/ko/introduce",
		languages: {
			ko: "https://webmemo.xyz/ko/introduce",
			en: "https://webmemo.xyz/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

export const metadataEnglish: Metadata = {
	title: "Web Memo - Take Notes While Browsing | Chrome Extension",
	description:
		"Web Memo is a Chrome extension that lets you instantly capture thoughts while reading web pages. Take notes on articles from the side panel, summarize YouTube videos with AI, and organize your saved memos systematically. Free to start.",
	alternates: {
		canonical: "https://webmemo.xyz/en/introduce",
		languages: {
			ko: "https://webmemo.xyz/ko/introduce",
			en: "https://webmemo.xyz/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};
