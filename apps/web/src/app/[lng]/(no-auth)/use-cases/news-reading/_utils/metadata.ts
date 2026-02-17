import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "뉴스 & 아티클 정리 - 읽으면서 메모하기 | 웹 메모",
	description:
		"뉴스, 블로그, 아티클을 읽으면서 중요한 내용을 바로 메모하세요. 인사이트를 체계적으로 정리하고 나중에 쉽게 찾아볼 수 있습니다.",
	keywords: [
		"뉴스 정리",
		"아티클 메모",
		"기사 스크랩",
		"블로그 정리",
		"읽기 메모",
		"article notes",
		"뉴스 클리핑",
		"콘텐츠 정리",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/use-cases/news-reading",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/news-reading",
			en: "https://webmemo.site/en/use-cases/news-reading",
		},
	},
	openGraph: {
		title: "뉴스 & 아티클 정리 - 읽으면서 메모하기 | 웹 메모",
		description:
			"뉴스, 블로그, 아티클을 읽으면서 중요한 내용을 바로 메모하세요.",
		images: ["/og-image-ko.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "News & Article Notes - Take Notes While Reading | Web Memo",
	description:
		"Take notes while reading news, blogs, and articles. Organize insights systematically and find them easily later.",
	keywords: [
		"news notes",
		"article notes",
		"news clipping",
		"blog notes",
		"reading notes",
		"content organization",
		"article highlights",
		"web clipping",
	],
	alternates: {
		canonical: "https://webmemo.site/en/use-cases/news-reading",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/news-reading",
			en: "https://webmemo.site/en/use-cases/news-reading",
		},
	},
	openGraph: {
		title: "News & Article Notes - Take Notes While Reading | Web Memo",
		description:
			"Take notes while reading news, blogs, and articles. Organize insights systematically.",
		images: ["/og-image-en.png"],
		type: "website",
	},
};
