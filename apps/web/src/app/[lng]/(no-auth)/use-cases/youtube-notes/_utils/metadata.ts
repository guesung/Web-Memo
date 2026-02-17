import type { Metadata } from "next";

export const metadataKorean: Metadata = {
	title: "유튜브 메모 - 영상 보면서 메모하기 | 웹 메모",
	description:
		"유튜브 영상을 보면서 중요한 내용을 바로 메모하세요. 강의, 튜토리얼, 리뷰 영상의 핵심을 기록하고 나중에 쉽게 찾아볼 수 있습니다.",
	keywords: [
		"유튜브 메모",
		"영상 메모",
		"유튜브 노트",
		"강의 메모",
		"튜토리얼 정리",
		"youtube notes",
		"영상 정리",
		"유튜브 학습",
	],
	alternates: {
		canonical: "https://webmemo.site/ko/use-cases/youtube-notes",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/youtube-notes",
			en: "https://webmemo.site/en/use-cases/youtube-notes",
		},
	},
	openGraph: {
		title: "유튜브 메모 - 영상 보면서 메모하기 | 웹 메모",
		description:
			"유튜브 영상을 보면서 중요한 내용을 바로 메모하세요. 강의, 튜토리얼, 리뷰 영상의 핵심을 기록하세요.",
		images: ["/og-image-ko.png"],
		type: "website",
	},
};

export const metadataEnglish: Metadata = {
	title: "YouTube Notes - Take Notes While Watching | Web Memo",
	description:
		"Take notes while watching YouTube videos. Capture key points from lectures, tutorials, and reviews. Find them easily later.",
	keywords: [
		"youtube notes",
		"video notes",
		"youtube note taking",
		"lecture notes",
		"tutorial notes",
		"video learning",
		"youtube study",
		"note taking app",
	],
	alternates: {
		canonical: "https://webmemo.site/en/use-cases/youtube-notes",
		languages: {
			ko: "https://webmemo.site/ko/use-cases/youtube-notes",
			en: "https://webmemo.site/en/use-cases/youtube-notes",
		},
	},
	openGraph: {
		title: "YouTube Notes - Take Notes While Watching | Web Memo",
		description:
			"Take notes while watching YouTube videos. Capture key points from lectures, tutorials, and reviews.",
		images: ["/og-image-en.png"],
		type: "website",
	},
};
