import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import type { Metadata } from "next";

import {
	AdditionalFeatures,
	Features,
	Footer,
	Hero,
	ImageSlider,
	QuestionAndAnswer,
} from "./_components";

const metadataKorean: Metadata = {
	title: "웹 메모 | 소개 ",
	description:
		"웹 메모는 웹페이지를 읽으며 생각을 즉시 기록할 수 있는 서비스입니다. 아티클을 읽다가 떠오른 아이디어나 중요한 내용을 사이드 패널에서 바로 메모하고 체계적으로 관리하세요.",
	alternates: {
		canonical: "https://web-memo.site/ko/introduce",
		languages: {
			ko: "https://web-memo.site/ko/introduce",
			en: "https://web-memo.site/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

const metadataEnglish: Metadata = {
	title: "Web Memo | Introduce",
	description:
		"Web Memo is a service that lets you instantly record your thoughts while reading web pages. Save ideas and important content that come to mind while reading articles through the side panel and manage them systematically.",
	alternates: {
		canonical: "https://web-memo.site/en/introduce",
		languages: {
			ko: "https://web-memo.site/ko/introduce",
			en: "https://web-memo.site/en/introduce",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface IntroducePageProps extends LanguageParams {}

export default function IntroducePage({ params: { lng } }: IntroducePageProps) {
	return (
		<div className="bg-background min-h-screen">
			<HeaderMargin />
			<main className="container mx-auto px-4 py-16">
				<Hero lng={lng} />
				<div className="container mx-auto px-4 py-12">
					<ImageSlider lng={lng} />
				</div>
				<Features lng={lng} />
				<AdditionalFeatures lng={lng} />
			</main>
			<QuestionAndAnswer lng={lng} />
			<Footer lng={lng} />
		</div>
	);
}
