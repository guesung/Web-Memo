import { CONFIG } from "@web-memo/env";
import type { Metadata } from "next";

const CANONICAL_KOREAN = `${CONFIG.webUrl}/ko/privacy`;
const CANONICAL_ENGLISH = `${CONFIG.webUrl}/en/privacy`;

export const metadataKorean: Metadata = {
	title: "개인정보처리방침 | 웹 메모",
	description:
		"웹 메모가 수집하는 사용자 데이터와 그 이용·보관·공유 방식, 확장 프로그램 권한 사용 이유, 데이터 처리를 위탁하는 제3자 목록을 안내합니다.",
	alternates: {
		canonical: CANONICAL_KOREAN,
		languages: {
			ko: CANONICAL_KOREAN,
			en: CANONICAL_ENGLISH,
		},
	},
	openGraph: {
		title: "개인정보처리방침 | 웹 메모",
		description:
			"웹 메모가 수집하는 사용자 데이터와 그 이용·보관·공유 방식을 안내합니다.",
		images: ["/og-image.png"],
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export const metadataEnglish: Metadata = {
	title: "Privacy Policy | Web Memo",
	description:
		"How Web Memo collects, uses, retains, and shares user data, why each extension permission is required, and the full list of third parties that process your data.",
	alternates: {
		canonical: CANONICAL_ENGLISH,
		languages: {
			ko: CANONICAL_KOREAN,
			en: CANONICAL_ENGLISH,
		},
	},
	openGraph: {
		title: "Privacy Policy | Web Memo",
		description: "How Web Memo collects, uses, retains, and shares user data.",
		images: ["/og-image.png"],
		type: "website",
	},
	robots: {
		index: true,
		follow: true,
	},
};
