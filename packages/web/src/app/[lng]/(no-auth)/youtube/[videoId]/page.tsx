import { HeaderMargin } from "@src/components/Header";
import type { Language, LanguageParams } from "@src/modules/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CTA, Summary, Thumbnail, VideoHeader, WatchButton } from "./_components";
import { getYoutubeSummary, incrementViewCount } from "./_utils";

interface YoutubeSummaryPageParams extends LanguageParams {
	params: {
		lng: Language;
		videoId: string;
	};
}

export async function generateMetadata({
	params,
}: YoutubeSummaryPageParams): Promise<Metadata> {
	const summary = await getYoutubeSummary(params.videoId);

	if (!summary) {
		return {
			title: "Video Not Found",
		};
	}

	const description = summary.summary.slice(0, 160);
	const title =
		params.lng === "ko"
			? `${summary.title} - AI 요약 | Slid`
			: `${summary.title} - AI Summary | Slid`;

	return {
		title,
		description,
		openGraph: {
			title: summary.title,
			description,
			images: summary.thumbnail_url
				? [summary.thumbnail_url]
				: [`https://img.youtube.com/vi/${params.videoId}/maxresdefault.jpg`],
			type: "article",
			siteName: "Slid",
		},
		twitter: {
			card: "summary_large_image",
			title: summary.title,
			description,
			images: summary.thumbnail_url
				? [summary.thumbnail_url]
				: [`https://img.youtube.com/vi/${params.videoId}/maxresdefault.jpg`],
		},
		alternates: {
			canonical: `https://slid.cc/${params.lng}/youtube/${params.videoId}`,
			languages: {
				ko: `https://slid.cc/ko/youtube/${params.videoId}`,
				en: `https://slid.cc/en/youtube/${params.videoId}`,
			},
		},
	};
}

export default async function YoutubeSummaryPage({
	params: { lng, videoId },
}: YoutubeSummaryPageParams) {
	const summary = await getYoutubeSummary(videoId);

	if (!summary) {
		notFound();
	}

	await incrementViewCount(videoId);

	return (
		<div className="min-h-screen bg-white">
			<HeaderMargin />
			<main className="mx-auto max-w-3xl px-4 py-8">
				<VideoHeader
					lng={lng}
					title={summary.title}
					channelName={summary.channel_name}
					publishedAt={summary.published_at}
					duration={summary.duration}
					viewCount={summary.view_count}
				/>
				<Thumbnail
					thumbnailUrl={summary.thumbnail_url}
					title={summary.title}
					videoId={videoId}
				/>
				<Summary lng={lng} summary={summary.summary} />
				<WatchButton lng={lng} videoUrl={summary.video_url} />
				<CTA lng={lng} />
			</main>
		</div>
	);
}
