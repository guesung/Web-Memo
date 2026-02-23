import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "개발자를 위한 웹 메모 - 코드 스니펫 & 기술 자료 정리 | 웹 메모",
	description:
		"Stack Overflow 답변, GitHub 이슈, 기술 블로그를 체계적으로 정리하세요. 개발 지식을 한 곳에서 관리할 수 있습니다.",
	keywords: [
		"개발자 메모",
		"코드 스니펫 저장",
		"기술 블로그 정리",
		"Stack Overflow 답변 저장",
		"GitHub 이슈 메모",
		"개발 문서 정리",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/use-cases/developer",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/developer",
			en: "https://webmemo.site/en/use-cases/developer",
		},
	},
	openGraph: {
		title: "개발자를 위한 웹 메모 - 코드 스니펫 & 기술 자료 정리 | 웹 메모",
		description:
			"Stack Overflow 답변, GitHub 이슈, 기술 블로그를 체계적으로 정리하세요.",
		images: ["/og-image.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Web Memo for Developers - Code Snippets & Tech Resources | Web Memo",
	description:
		"Organize Stack Overflow answers, GitHub issues, and tech blogs systematically. Manage your development knowledge in one place.",
	keywords: [
		"developer notes",
		"code snippet saver",
		"tech blog organizer",
		"Stack Overflow clipper",
		"GitHub issue notes",
		"documentation notes",
	],
	alternates: {
		canonical: "https://webmemo.site/en/use-cases/developer",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/developer",
			en: "https://webmemo.site/en/use-cases/developer",
		},
	},
	openGraph: {
		title:
			"Web Memo for Developers - Code Snippets & Tech Resources | Web Memo",
		description:
			"Organize Stack Overflow answers, GitHub issues, and tech blogs systematically.",
		images: ["/og-image.png"],
		type: "website",
	},
};
