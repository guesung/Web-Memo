export interface YoutubeSummaryRequest {
	video_id: string;
	video_url?: string;
	language?: "ko" | "en";
	summary_text?: string;
}

export interface YoutubeSummaryResponse {
	id: string;
	video_id: string;
	video_url: string;
	title: string;
	channel_name: string | null;
	thumbnail_url: string | null;
	duration: string | null;
	published_at: string | null;
	summary: string;
	language: string;
	view_count: number;
	created_at: string;
	is_new: boolean;
}

export interface YoutubeMetadata {
	title: string;
	channelName: string | null;
	thumbnailUrl: string | null;
	duration: string | null;
	publishedAt: string | null;
}

export interface TranscriptResponse {
	transcript: string;
}
