import { getSupabaseClient } from "@src/modules/supabase/util.server";

export interface YoutubeSummary {
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
}

export async function getYoutubeSummary(
	videoId: string,
): Promise<YoutubeSummary | null> {
	try {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from("youtube_summaries")
			.select("*")
			.eq("video_id", videoId)
			.single();

		if (error || !data) {
			return null;
		}

		return data as YoutubeSummary;
	} catch (error) {
		console.error("Failed to fetch youtube summary:", error);
		return null;
	}
}

export async function incrementViewCount(videoId: string): Promise<void> {
	try {
		const supabase = getSupabaseClient();
		await supabase.rpc(
			"increment_youtube_summary_view_count" as unknown as never,
			{ p_video_id: videoId } as never,
		);
	} catch (error) {
		console.error("Failed to increment view count:", error);
	}
}
