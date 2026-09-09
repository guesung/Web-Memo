import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { CONFIG } from "@web-memo/env";
import type { Metadata } from "next";

import { UpdateList, UpdateTitle } from "./_components";

const metadataKorean: Metadata = {
	title: "업데이트 소식 | 웹 메모",
	description:
		"웹 메모의 새 기능과 개선 사항을 버전별로 정리했습니다. AI 요약, 사이드 패널, 메모 관리 기능이 어떻게 바뀌어 왔는지 최신 릴리스 노트에서 확인하세요.",
	alternates: {
		canonical: `${CONFIG.webUrl}/ko/update`,
		languages: {
			ko: `${CONFIG.webUrl}/ko/update`,
			en: `${CONFIG.webUrl}/en/update`,
			"x-default": `${CONFIG.webUrl}/en/update`,
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

const metadataEnglish: Metadata = {
	title: "Product Updates | Web Memo",
	description:
		"Release notes for Web Memo, version by version. See how AI summaries, the side panel, and memo management have evolved in the latest updates.",
	alternates: {
		canonical: `${CONFIG.webUrl}/en/update`,
		languages: {
			ko: `${CONFIG.webUrl}/ko/update`,
			en: `${CONFIG.webUrl}/en/update`,
			"x-default": `${CONFIG.webUrl}/en/update`,
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface UpdatesPageProps extends LanguageParams {}

export default async function UpdatesPage({
	params: { lng },
}: UpdatesPageProps) {
	return (
		<main className="bg-background min-h-screen">
			<HeaderMargin />
			<div className="container mx-auto px-4 py-16">
				<UpdateTitle lng={lng} />
				<UpdateList lng={lng} />
			</div>
		</main>
	);
}
