import type { Metadata } from "next";

export const metadataCommon: Metadata = {
	metadataBase: new URL("https://webmemo.site"),
	icons: {
		icon: "/favicon.ico",
	},
	alternates: {
		canonical: "https://webmemo.site",
	},
	verification: {
		google: "e92NNntqJ--8e3A0jAc-YFB3QwHg46AQQ4eplMUvqtQ",
		other: {
			"naver-site-verification": "7140428f3bcb61efc36b5e1cfb62305c2e57e181",
		},
	},
};

export const metadataKorean: Metadata = {
	...metadataCommon,
	title: "웹 메모",
	description:
		"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록할 수 있는 서비스입니다. 아티클을 읽다가 떠오른 아이디어나 중요한 내용을 사이드 패널에서 바로 메모하고 체계적으로 관리하세요.",
	keywords: ["웹 메모", "온라인 메모", "메모장", "노트"],
	authors: [{ name: "박규성", url: "https://github.com/guesung" }],
	creator: "박규성",
	publisher: "박규성",
	applicationName: "웹 메모",
	category: "웹 메모",
	alternates: {
		canonical: "https://webmemo.site/ko",
		languages: {
			ko: "https://webmemo.site/ko",
			en: "https://webmemo.site/en",
		},
	},
	openGraph: {
		title: "웹 메모",
		description:
			"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록할 수 있는 서비스입니다. 아티클을 읽다가 떠오른 아이디어나 중요한 내용을 사이드 패널에서 바로 메모하고 체계적으로 관리하세요.",
		images: ["/og-image.png"],
		siteName: "웹 메모",
		type: "website",
		locale: "ko_KR",
		countryName: "대한민국",
	},
	twitter: {
		card: "summary_large_image",
		title: "웹 메모",
		description:
			"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록할 수 있는 서비스입니다. 아티클을 읽다가 떠오른 아이디어나 중요한 내용을 사이드 패널에서 바로 메모하고 체계적으로 관리하세요.",
		images: ["/og-image.png"],
	},
};

export const metadataEnglish: Metadata = {
	...metadataCommon,
	title: "Web Memo",
	description:
		"Web Memo is a service that lets you instantly record your thoughts while reading web pages. Save ideas and important content that come to mind while reading articles through the side panel and manage them systematically.",
	keywords: ["web memo", "online memo", "notepad", "notes"],
	authors: [{ name: "Gyusung Park", url: "https://github.com/guesung" }],
	creator: "Gyusung Park",
	publisher: "Gyusung Park",
	applicationName: "Web Memo",
	category: "Web Memo",
	metadataBase: new URL("https://webmemo.site"),
	openGraph: {
		title: "Web Memo",
		description:
			"Web Memo is a service that lets you instantly record your thoughts while reading web pages. Save ideas and important content that come to mind while reading articles through the side panel and manage them systematically.",
		images: ["/og-image.png"],
		siteName: "Web Memo",
		type: "website",
		locale: "en_US",
		countryName: "United States",
	},
	twitter: {
		card: "summary_large_image",
		title: "Web Memo",
		description:
			"Web Memo is a service that lets you instantly record your thoughts while reading web pages. Save ideas and important content that come to mind while reading articles through the side panel and manage them systematically.",
		images: ["/og-image.png"],
	},
};
