import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "취업 준비 - 채용공고 & 회사 정보 정리 | 웹 메모",
	description:
		"채용공고, 회사 정보, 면접 준비 자료를 체계적으로 정리하세요. 지원한 회사와 포지션을 한눈에 관리할 수 있습니다.",
	keywords: [
		"취업 준비",
		"채용공고 정리",
		"회사 정보 메모",
		"면접 준비",
		"취준 메모",
		"job hunting",
		"구직 정리",
		"지원 관리",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/use-cases/job-hunting",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/job-hunting",
			en: "https://webmemo.site/en/use-cases/job-hunting",
		},
	},
	openGraph: {
		title: "취업 준비 - 채용공고 & 회사 정보 정리 | 웹 메모",
		description:
			"채용공고, 회사 정보, 면접 준비 자료를 체계적으로 정리하세요.",
		images: ["/og-image-ko.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Job Hunting - Organize Job Postings & Company Info | Web Memo",
	description:
		"Organize job postings, company information, and interview prep materials systematically. Manage applications and positions at a glance.",
	keywords: [
		"job hunting",
		"job search notes",
		"company research",
		"interview prep",
		"job application tracker",
		"career notes",
		"job search organization",
		"application management",
	],
	alternates: {
		canonical: "https://webmemo.site/en/use-cases/job-hunting",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/job-hunting",
			en: "https://webmemo.site/en/use-cases/job-hunting",
		},
	},
	openGraph: {
		title: "Job Hunting - Organize Job Postings & Company Info | Web Memo",
		description:
			"Organize job postings, company information, and interview prep materials systematically.",
		images: ["/og-image-en.png"],
		type: "website",
	},
};
