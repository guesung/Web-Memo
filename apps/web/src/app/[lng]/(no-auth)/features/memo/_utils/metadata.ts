import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "브라우저 메모 - 아티클 읽으며 바로 메모 | 웹 메모",
	description:
		"웹페이지를 읽으면서 떠오르는 생각을 바로 메모하세요. 사이드 패널에서 간편하게 메모하고 체계적으로 관리할 수 있습니다. 무료 크롬 확장 프로그램으로 시작하세요.",
	keywords: [
		"브라우저 메모",
		"아티클 메모",
		"웹페이지 메모",
		"사이드 패널 메모",
		"웹 메모",
		"browser notes",
		"온라인 메모",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/features/memo",
		languages: {
			ko: "https://webmemo.site/ko/features/memo",
			en: "https://webmemo.site/en/features/memo",
		},
	},
	openGraph: {
		title: "브라우저 메모 - 아티클 읽으며 바로 메모 | 웹 메모",
		description:
			"웹페이지를 읽으면서 떠오르는 생각을 바로 메모하세요. 사이드 패널에서 간편하게 메모하고 체계적으로 관리할 수 있습니다.",
		images: ["/og-image.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Browser Notes - Take Notes While Reading | Web Memo",
	description:
		"Take notes while reading web pages. Capture your thoughts instantly in the side panel and organize them systematically. Get started with our free Chrome extension.",
	keywords: [
		"browser notes",
		"article notes",
		"web page notes",
		"side panel notes",
		"web memo",
		"online notes",
		"reading notes",
	],
	alternates: {
		canonical: "https://webmemo.site/en/features/memo",
		languages: {
			ko: "https://webmemo.site/ko/features/memo",
			en: "https://webmemo.site/en/features/memo",
		},
	},
	openGraph: {
		title: "Browser Notes - Take Notes While Reading | Web Memo",
		description:
			"Take notes while reading web pages. Capture your thoughts instantly in the side panel and organize them systematically.",
		images: ["/og-image.png"],
		type: "website",
	},
};
