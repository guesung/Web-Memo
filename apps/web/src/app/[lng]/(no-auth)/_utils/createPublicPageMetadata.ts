import { CONFIG } from "@web-memo/env";
import type { Metadata } from "next";

/** 공개 페이지의 검색 정보와 언어별 공유 정보를 같은 콘텐츠로 생성합니다. */
export const createPublicPageMetadata = (
	options: IFPublicPageMetadata,
): Metadata => {
	const canonicalKorean = `${CONFIG.webUrl}/ko${options.path}`;
	const canonicalEnglish = `${CONFIG.webUrl}/en${options.path}`;
	const canonical =
		options.language === "ko" ? canonicalKorean : canonicalEnglish;
	const content = { title: options.title, description: options.description };

	return {
		...content,
		...(options.keywords === undefined ? {} : { keywords: options.keywords }),
		...(options.robots === undefined ? {} : { robots: options.robots }),
		alternates: {
			canonical,
			languages: {
				ko: canonicalKorean,
				en: canonicalEnglish,
				"x-default": canonicalEnglish,
			},
		},
		openGraph: {
			...content,
			images: ["/og-image.png"],
			type: "website",
			siteName: options.language === "ko" ? "웹 메모" : "Web Memo",
			locale: options.language === "ko" ? "ko_KR" : "en_US",
			url: canonical,
		},
		twitter: {
			...content,
			card: "summary_large_image",
			images: ["/og-image.png"],
		},
	};
};

/** 페이지 고유 콘텐츠와 기존 검색 정책을 전달하는 입력입니다. */
interface IFPublicPageMetadata {
	language: "ko" | "en";
	path: string;
	title: string;
	description: string;
	keywords?: Metadata["keywords"];
	robots?: Metadata["robots"];
}
