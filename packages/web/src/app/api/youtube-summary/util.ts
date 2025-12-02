import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import type { Database } from "@web-memo/shared/types";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { CORS_HEADERS, YOUTUBE_SUMMARY_PROMPT } from "./constant";
import type { TranscriptResponse, YoutubeMetadata } from "./type";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function createErrorResponse(error: string, status: number) {
	return NextResponse.json({ error }, { status, headers: CORS_HEADERS });
}

export function createSuccessResponse<T>(data: T) {
	return NextResponse.json(data, { status: 200, headers: CORS_HEADERS });
}

export function getSupabaseServiceClient() {
	const supabaseUrl = CONFIG.supabaseUrl;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseServiceKey) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
	}

	return createClient<Database, "memo", Database["memo"]>(
		supabaseUrl,
		supabaseServiceKey,
		{
			db: { schema: "memo" },
		},
	);
}

export async function getExistingSummary(videoId: string) {
	const supabase = getSupabaseServiceClient();

	const { data, error } = await supabase
		.from("youtube_summaries")
		.select("*")
		.eq("video_id", videoId)
		.single();

	if (error && error.code !== "PGRST116") {
		throw error;
	}

	return data;
}

export async function fetchYoutubeTranscript(
	videoId: string,
): Promise<string> {
	const transcriptUrl = `${CONFIG.youtubeTranscriptUrl}/api/youtube-transcript?video_id=${videoId}`;

	const response = await fetch(transcriptUrl);

	if (!response.ok) {
		throw new Error("Failed to fetch transcript");
	}

	const data: TranscriptResponse = await response.json();
	return data.transcript;
}

export async function fetchYoutubeMetadata(
	videoId: string,
): Promise<YoutubeMetadata> {
	const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

	return {
		title: "",
		channelName: null,
		thumbnailUrl,
		duration: null,
		publishedAt: null,
	};
}

export async function generateSummary(
	transcript: string,
	language: "ko" | "en" = "ko",
): Promise<string> {
	if (!OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not set");
	}

	const openai = new OpenAI({
		apiKey: OPENAI_API_KEY,
	});

	const systemPrompt = YOUTUBE_SUMMARY_PROMPT[language];

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: transcript },
		],
		temperature: 0.3,
		max_tokens: 2000,
	});

	const summary = completion.choices[0]?.message?.content;

	if (!summary) {
		throw new Error("Failed to generate summary");
	}

	return summary;
}

export async function saveSummaryToDatabase(params: {
	videoId: string;
	videoUrl: string;
	title: string;
	channelName: string | null;
	thumbnailUrl: string | null;
	duration: string | null;
	publishedAt: string | null;
	summary: string;
	language: string;
}) {
	const supabase = getSupabaseServiceClient();

	const { data, error } = await supabase
		.from("youtube_summaries")
		.insert({
			video_id: params.videoId,
			video_url: params.videoUrl,
			title: params.title || `YouTube Video ${params.videoId}`,
			channel_name: params.channelName,
			thumbnail_url: params.thumbnailUrl,
			duration: params.duration,
			published_at: params.publishedAt,
			summary: params.summary,
			language: params.language,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return data;
}

export function extractVideoIdFromUrl(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/^[a-zA-Z0-9_-]{11}$/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1] || match[0];
		}
	}

	return null;
}

export function buildVideoUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`;
}
