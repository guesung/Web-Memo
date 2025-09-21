import type { Metadata } from "next";

export const metadataCommon: Metadata = {
	metadataBase: new URL("https://web-memo.site"),
	icons: {
		icon: "/favicon.ico",
	},
	alternates: {
		canonical: "https://web-memo.site",
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
		"웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.",
	keywords: ["웹 메모", "온라인 메모", "메모장", "노트"],
	authors: [{ name: "박규성", url: "https://github.com/guesung" }],
	creator: "박규성",
	publisher: "박규성",
	applicationName: "웹 메모",
	category: "웹 메모",
	openGraph: {
		title: "웹 메모",
		description:
			"웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.",
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
			"웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.",
		images: ["/og-image.png"],
	},
};

export const metadataEnglish: Metadata = {
	...metadataCommon,
	title: "Web Memo",
	description:
		"Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.",
	keywords: ["web memo", "online memo", "notepad", "notes"],
	authors: [{ name: "Gyusung Park", url: "https://github.com/guesung" }],
	creator: "Gyusung Park",
	publisher: "Gyusung Park",
	applicationName: "Web Memo",
	category: "Web Memo",
	metadataBase: new URL("https://web-memo.site"),
	openGraph: {
		title: "Web Memo",
		description:
			"Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.",
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
			"Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.",
		images: ["/og-image.png"],
	},
};
