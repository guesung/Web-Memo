import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import type { Metadata } from "next";

import {
	Features,
	FinalCTA,
	Footer,
	Hero,
	HowItWorks,
	InteractiveDemo,
	QuestionAndAnswer,
	SocialProofBar,
	StatsSection,
	Testimonials,
	UseCases,
} from "./_components";

// Chrome 웹스토어 기준 통계 (하드코딩)
const CHROME_STORE_STATS = {
	userCount: 250,
	rating: 5.0,
};

async function getMemoCount(): Promise<number> {
	try {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc(
			"get_memo_count" as unknown as never,
		);

		if (error) {
			console.error("Failed to fetch memo count:", error);
			return 10000;
		}

		return (data as number) ?? 10000;
	} catch (error) {
		console.error("Failed to fetch memo count:", error);
		return 10000;
	}
}

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

export default async function IntroducePage({
	params: { lng },
}: IntroducePageProps) {
	const memoCount = await getMemoCount();

	const stats = {
		...CHROME_STORE_STATS,
		memoCount,
	};

	return (
		<div className="min-h-screen overflow-hidden">
			<HeaderMargin />

			{/* Hero Section */}
			<Hero lng={lng} />

			{/* Social Proof Bar */}
			<SocialProofBar lng={lng} />

			{/* Interactive Demo */}
			<InteractiveDemo lng={lng} />

			{/* Features Bento Grid */}
			<Features lng={lng} />

			{/* Stats Section */}
			<StatsSection lng={lng} stats={stats} />

			{/* How It Works */}
			<HowItWorks lng={lng} />

			{/* Use Cases */}
			<UseCases lng={lng} />

			{/* Testimonials */}
			<Testimonials lng={lng} />

			{/* FAQ */}
			<QuestionAndAnswer lng={lng} />

			{/* Final CTA */}
			<FinalCTA lng={lng} />

			{/* Footer */}
			<Footer lng={lng} />
		</div>
	);
}
