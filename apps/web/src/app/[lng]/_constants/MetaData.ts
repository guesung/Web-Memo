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
		google: "vPlV59W1xMxt-XN4Qf4i1zmIW1pD_gVOIS595iCn5_w",
		other: {
			"naver-site-verification": "d78c677961160b3054652639e8f5baff2fdb6793",
		},
	},
};

/** 한국어 페이지의 기본 검색 및 공유 메타데이터입니다. */
export const metadataKorean: Metadata = {
	...metadataCommon,
	title: "웹 메모",
	description:
		"읽던 페이지에서 바로 메모하고, 웹과 앱에서 다시 꺼내 보세요. 웹 메모의 사이드 패널에서 아티클을 읽다가 떠오른 생각과 중요한 내용을 기록하고 관리하세요.",
	keywords: ["웹 메모", "온라인 메모", "메모장", "노트"],
	authors: [{ url: "https://github.com/guesung" }],
	applicationName: "웹 메모",
	category: "웹 메모",
	openGraph: {
		title: "웹 메모",
		description:
			"읽던 페이지에서 바로 메모하고, 웹과 앱에서 다시 꺼내 보세요. 웹 메모의 사이드 패널에서 아티클을 읽다가 떠오른 생각과 중요한 내용을 기록하고 관리하세요.",
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
			"읽던 페이지에서 바로 메모하고, 웹과 앱에서 다시 꺼내 보세요. 웹 메모의 사이드 패널에서 아티클을 읽다가 떠오른 생각과 중요한 내용을 기록하고 관리하세요.",
		images: ["/og-image.png"],
	},
};

/** 영어 페이지의 기본 검색 및 공유 메타데이터입니다. */
export const metadataEnglish: Metadata = {
	...metadataCommon,
	title: "Web Memo",
	description:
		"Take notes on the page you’re reading, then revisit them on the web or in the app. Capture ideas and important content in the Web Memo side panel and organize your saved notes.",
	keywords: ["web memo", "online memo", "notepad", "notes"],
	authors: [{ url: "https://github.com/guesung" }],
	applicationName: "Web Memo",
	category: "Web Memo",
	openGraph: {
		title: "Web Memo",
		description:
			"Take notes on the page you’re reading, then revisit them on the web or in the app. Capture ideas and important content in the Web Memo side panel and organize your saved notes.",
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
			"Take notes on the page you’re reading, then revisit them on the web or in the app. Capture ideas and important content in the Web Memo side panel and organize your saved notes.",
		images: ["/og-image.png"],
	},
};
