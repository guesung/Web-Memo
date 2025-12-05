import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "온라인 학습을 위한 웹 메모 | 웹 메모",
	description:
		"온라인 강의, 유튜브 교육 영상을 보면서 효율적으로 학습하세요. AI로 영상을 요약하고, 중요 내용을 메모하고, 체계적으로 복습할 수 있습니다.",
	keywords: [
		"온라인 학습",
		"인강 메모",
		"유튜브 학습",
		"강의 노트",
		"학습 도구",
		"online learning",
		"교육 영상 정리",
	],
	alternates: {
		canonical: "https://web-memo.site/ko/use-cases/learning",
		languages: {
			ko: "https://web-memo.site/ko/use-cases/learning",
			en: "https://web-memo.site/en/use-cases/learning",
		},
	},
	openGraph: {
		title: "온라인 학습을 위한 웹 메모 | 웹 메모",
		description:
			"온라인 강의, 유튜브 교육 영상을 보면서 효율적으로 학습하세요.",
		images: ["/og-image.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "Web Memo for Online Learning | Web Memo",
	description:
		"Learn efficiently while watching online courses and YouTube tutorials. Summarize videos with AI, take notes on key content, and review systematically.",
	keywords: [
		"online learning",
		"course notes",
		"youtube learning",
		"lecture notes",
		"learning tool",
		"study helper",
		"educational video notes",
	],
	alternates: {
		canonical: "https://web-memo.site/en/use-cases/learning",
		languages: {
			ko: "https://web-memo.site/ko/use-cases/learning",
			en: "https://web-memo.site/en/use-cases/learning",
		},
	},
	openGraph: {
		title: "Web Memo for Online Learning | Web Memo",
		description:
			"Learn efficiently while watching online courses and YouTube tutorials. Summarize videos with AI, take notes on key content, and review systematically.",
		images: ["/og-image.png"],
		type: "website",
	},
};
