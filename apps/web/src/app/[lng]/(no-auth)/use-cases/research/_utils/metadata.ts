import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "리서치 & 자료 조사를 위한 웹 메모 | 웹 메모",
	description:
		"논문, 아티클, 자료 조사를 할 때 웹 메모로 효율적으로 정리하세요. 중요한 내용을 즉시 메모하고, AI로 요약하고, 체계적으로 관리할 수 있습니다.",
	keywords: [
		"리서치 도구",
		"자료 조사",
		"논문 정리",
		"레퍼런스 관리",
		"연구 메모",
		"research tool",
		"자료 수집",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/use-cases/research",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/research",
			en: "https://webmemo.site/en/use-cases/research",
		},
	},
	openGraph: {
		title: "리서치 & 자료 조사를 위한 웹 메모 | 웹 메모",
		description:
			"논문, 아티클, 자료 조사를 할 때 웹 메모로 효율적으로 정리하세요.",
		images: ["/og-image-ko.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Web Memo for Research & Study | Web Memo",
	description:
		"Organize your research efficiently with Web Memo. Take instant notes on papers and articles, summarize with AI, and manage everything systematically.",
	keywords: [
		"research tool",
		"study notes",
		"paper organization",
		"reference management",
		"research notes",
		"academic research",
		"information gathering",
	],
	alternates: {
		canonical: "https://webmemo.site/en/use-cases/research",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/research",
			en: "https://webmemo.site/en/use-cases/research",
		},
	},
	openGraph: {
		title: "Web Memo for Research & Study | Web Memo",
		description:
			"Organize your research efficiently with Web Memo. Take instant notes on papers and articles, summarize with AI, and manage everything systematically.",
		images: ["/og-image-en.png"],
		type: "website",
	},
};
