import { CONFIG } from "@web-memo/env";
import type { Metadata } from "next";

/**
 * 로케일 레이아웃 공통 메타데이터.
 *
 * @description
 * 여기에 alternates(canonical/hreflang)를 두면 안 된다. Next의 metadata 는 하위
 * 라우트로 상속되므로, 자체 alternates 가 없는 페이지(`/ko/uninstall` 등)가 레이아웃의
 * canonical 을 그대로 달아 "다른 페이지"를 정본으로 지목하게 된다. 크로스 페이지
 * canonical 은 그 페이지를 색인에서 지운다.
 *
 * canonical·hreflang 은 페이지별 metadata 에서 선언하고, 선언하지 않는 페이지는
 * 색인 대상이 아니므로 robots.index=false 를 준다.
 */
export const metadataCommon: Metadata = {
	metadataBase: new URL(CONFIG.webUrl),
	icons: {
		icon: "/favicon.ico",
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
	authors: [{ url: "https://github.com/guesung" }],
	applicationName: "웹 메모",
	category: "웹 메모",
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
	authors: [{ url: "https://github.com/guesung" }],
	applicationName: "Web Memo",
	category: "Web Memo",
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
