import type { NextRequest } from "next/server";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "./constant";
import type { YoutubeSummaryRequest, YoutubeSummaryResponse } from "./type";
import {
	buildVideoUrl,
	createErrorResponse,
	createSuccessResponse,
	extractVideoIdFromUrl,
	fetchYoutubeMetadata,
	fetchYoutubeTranscript,
	generateSummary,
	getExistingSummary,
	saveSummaryToDatabase,
} from "./util";

export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const videoIdParam = searchParams.get("video_id");

		if (!videoIdParam) {
			return createErrorResponse(
				ERROR_MESSAGES.MISSING_VIDEO_ID,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const videoId = extractVideoIdFromUrl(videoIdParam) || videoIdParam;

		if (!videoId || videoId.length !== 11) {
			return createErrorResponse(
				ERROR_MESSAGES.INVALID_VIDEO_ID,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const existingSummary = await getExistingSummary(videoId);

		if (existingSummary) {
			const response: YoutubeSummaryResponse = {
				...existingSummary,
				is_new: false,
			};
			return createSuccessResponse(response);
		}

		return createErrorResponse(
			"요약이 존재하지 않습니다. POST 요청으로 생성해주세요.",
			HTTP_STATUS.NOT_FOUND,
		);
	} catch (error) {
		console.error("GET youtube-summary error:", error);
		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: YoutubeSummaryRequest = await request.json();
		const { video_id, video_url, language = "ko", summary_text } = body;

		if (!video_id) {
			return createErrorResponse(
				ERROR_MESSAGES.MISSING_VIDEO_ID,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const videoId = extractVideoIdFromUrl(video_id) || video_id;

		if (!videoId || videoId.length !== 11) {
			return createErrorResponse(
				ERROR_MESSAGES.INVALID_VIDEO_ID,
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const existingSummary = await getExistingSummary(videoId);

		if (existingSummary) {
			const response: YoutubeSummaryResponse = {
				...existingSummary,
				is_new: false,
			};
			return createSuccessResponse(response);
		}

		let summary: string;

		if (summary_text) {
			summary = summary_text;
		} else {
			let transcript: string;
			try {
				transcript = await fetchYoutubeTranscript(videoId);
			} catch (error) {
				console.error("Transcript fetch error:", error);
				return createErrorResponse(
					ERROR_MESSAGES.TRANSCRIPT_FETCH_FAILED,
					HTTP_STATUS.BAD_REQUEST,
				);
			}

			try {
				summary = await generateSummary(transcript, language);
			} catch (error) {
				console.error("Summary generation error:", error);
				return createErrorResponse(
					ERROR_MESSAGES.SUMMARY_GENERATION_FAILED,
					HTTP_STATUS.INTERNAL_SERVER_ERROR,
				);
			}
		}

		const metadata = await fetchYoutubeMetadata(videoId);
		const finalVideoUrl = video_url || buildVideoUrl(videoId);

		let savedSummary;
		try {
			savedSummary = await saveSummaryToDatabase({
				videoId,
				videoUrl: finalVideoUrl,
				title: metadata.title || `YouTube Video ${videoId}`,
				channelName: metadata.channelName,
				thumbnailUrl: metadata.thumbnailUrl,
				duration: metadata.duration,
				publishedAt: metadata.publishedAt,
				summary,
				language,
			});
		} catch (error) {
			console.error("Database save error:", error);
			return createErrorResponse(
				ERROR_MESSAGES.DATABASE_ERROR,
				HTTP_STATUS.INTERNAL_SERVER_ERROR,
			);
		}

		const response: YoutubeSummaryResponse = {
			...savedSummary,
			is_new: true,
		};

		return createSuccessResponse(response);
	} catch (error) {
		console.error("POST youtube-summary error:", error);
		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}
