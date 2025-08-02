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
	title: "웹 메모 - 웹서핑을 더 쉽게 | 클릭 한 번으로 메모하고 AI로 요약하세요",
	description:
		"웹서핑 중 중요한 정보를 놓치지 마세요. 웹 메모로 클릭 한 번에 메모하고, AI가 핵심 내용을 요약해드립니다. 100+ 사용자가 선택한 최고의 웹 메모 도구입니다.",
	keywords:
		"웹 메모, 메모 앱, AI 요약, 웹서핑 도구, 크롬 확장프로그램, 생산성 도구",
	authors: [{ name: "Web Memo Team" }],
	creator: "Web Memo",
	publisher: "Web Memo",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		title: "웹 메모 - 웹서핑을 더 쉽게",
		description:
			"클릭 한 번으로 메모하고, AI로 요약하고, 체계적으로 관리하세요. 100+ 사용자가 선택한 최고의 웹 메모 도구입니다.",
		url: "https://web-memo.com",
		siteName: "Web Memo",
		images: [
			{
				url: "/images/pngs/guide.png",
				width: 1200,
				height: 630,
				alt: "웹 메모 소개 이미지",
			},
		],
		locale: "ko_KR",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "웹 메모 - 웹서핑을 더 쉽게",
		description:
			"클릭 한 번으로 메모하고, AI로 요약하고, 체계적으로 관리하세요.",
		images: ["/images/pngs/guide.png"],
	},
	alternates: {
		canonical: "https://web-memo.com",
		languages: {
			ko: "https://web-memo.com/ko",
			en: "https://web-memo.com/en",
		},
	},
};

const metadataEnglish: Metadata = {
	title:
		"Web Memo - Make Web Browsing Easier | Save with One Click, Summarize with AI",
	description:
		"Don't miss important information while browsing. Save with one click and let AI summarize key content. The best web memo tool chosen by 100+ users.",
	keywords:
		"web memo, memo app, AI summary, browsing tool, chrome extension, productivity tool",
	authors: [{ name: "Web Memo Team" }],
	creator: "Web Memo",
	publisher: "Web Memo",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		title: "Web Memo - Make Web Browsing Easier",
		description:
			"Save with one click, summarize with AI, organize systematically. The best web memo tool chosen by 100+ users.",
		url: "https://web-memo.com",
		siteName: "Web Memo",
		images: [
			{
				url: "/images/pngs/guide.png",
				width: 1200,
				height: 630,
				alt: "Web Memo Introduction Image",
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Web Memo - Make Web Browsing Easier",
		description:
			"Save with one click, summarize with AI, organize systematically.",
		images: ["/images/pngs/guide.png"],
	},
	alternates: {
		canonical: "https://web-memo.com",
		languages: {
			ko: "https://web-memo.com/ko",
			en: "https://web-memo.com/en",
		},
	},
};

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface IntroducePageProps extends LanguageParams {}

export default function IntroducePage({ params: { lng } }: IntroducePageProps) {
	return (
		<>
			{/* Structured Data for SEO */}
			<script
				type="application/ld+json"
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "SoftwareApplication",
						name: lng === "ko" ? "웹 메모" : "Web Memo",
						description:
							lng === "ko"
								? "웹서핑을 더 쉽게 만들어주는 크롬 확장 프로그램"
								: "Chrome extension that makes web browsing easier",
						applicationCategory: "ProductivityApplication",
						operatingSystem: "Chrome",
						offers: {
							"@type": "Offer",
							price: "0",
							priceCurrency: "USD",
						},
						aggregateRating: {
							"@type": "AggregateRating",
							ratingValue: "5.0",
							ratingCount: "100",
						},
					}),
				}}
			/>

			<div className="bg-background min-h-screen">
				<HeaderMargin />

				{/* Hero Section */}
				<section className="py-16 md:py-24">
					<main className="container mx-auto px-4">
						<Hero lng={lng} />
					</main>
				</section>

				{/* Image Slider Section */}
				<section className="py-12 bg-gray-50 dark:bg-gray-900">
					<div className="container mx-auto px-4">
						<ImageSlider lng={lng} />
					</div>
				</section>

				{/* Features Section */}
				<section className="py-16">
					<div className="container mx-auto px-4">
						<Features lng={lng} />
					</div>
				</section>

				{/* Additional Features Section */}
				<section className="py-16 bg-gray-50 dark:bg-gray-900">
					<div className="container mx-auto px-4">
						<AdditionalFeatures lng={lng} />
					</div>
				</section>

				{/* FAQ Section */}
				<section className="py-16">
					<div className="container mx-auto px-4">
						<QuestionAndAnswer lng={lng} />
					</div>
				</section>

				{/* Footer */}
				<Footer lng={lng} />
			</div>
		</>
	);
}
