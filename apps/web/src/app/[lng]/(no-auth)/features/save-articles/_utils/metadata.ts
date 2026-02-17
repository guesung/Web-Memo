import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "웹페이지 저장 - 아티클 나중에 보기 | 웹 메모",
	description:
		"관심 있는 아티클과 웹페이지를 위시리스트에 저장하세요. 나중에 볼 콘텐츠를 체계적으로 관리하고 언제든지 다시 찾아볼 수 있습니다. 무료 크롬 확장 프로그램.",
	keywords: [
		"웹페이지 저장",
		"아티클 저장",
		"나중에 보기",
		"위시리스트",
		"북마크 관리",
		"save articles",
		"콘텐츠 저장",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/features/save-articles",
		languages: {
			ko: "https://webmemo.site/ko/features/save-articles",
			en: "https://webmemo.site/en/features/save-articles",
		},
	},
	openGraph: {
		title: "웹페이지 저장 - 아티클 나중에 보기 | 웹 메모",
		description:
			"관심 있는 아티클과 웹페이지를 위시리스트에 저장하세요. 나중에 볼 콘텐츠를 체계적으로 관리할 수 있습니다.",
		images: ["/og-image-ko.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Save Web Pages - Read Articles Later | Web Memo",
	description:
		"Save interesting articles and web pages to your wishlist. Organize content to read later and easily find them anytime. Free Chrome extension.",
	keywords: [
		"save web pages",
		"save articles",
		"read later",
		"wishlist",
		"bookmark manager",
		"content saving",
		"article organizer",
	],
	alternates: {
		canonical: "https://webmemo.site/en/features/save-articles",
		languages: {
			ko: "https://webmemo.site/ko/features/save-articles",
			en: "https://webmemo.site/en/features/save-articles",
		},
	},
	openGraph: {
		title: "Save Web Pages - Read Articles Later | Web Memo",
		description:
			"Save interesting articles and web pages to your wishlist. Organize content to read later and easily find them anytime.",
		images: ["/og-image-en.png"],
		type: "website",
	},
};
