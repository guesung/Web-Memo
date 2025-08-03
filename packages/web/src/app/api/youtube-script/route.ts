import { exec } from "child_process";
import { type NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

const scriptPath = "src/scripts/youtube_script.py";

// YouTube URL에서 video ID를 추출하는 함수
function extractVideoId(input: string): string | null {
	// 이미 video ID인 경우 (11자리)
	if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
		return input;
	}

	// YouTube URL에서 video ID 추출
	const urlPatterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
	];

	for (const pattern of urlPatterns) {
		const match = input.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const videoInput = searchParams.get("video");

		if (!videoInput) {
			return NextResponse.json(
				{ error: "video parameter is required (video ID or YouTube URL)" },
				{ status: 400 },
			);
		}

		const videoId = extractVideoId(videoInput);
		if (!videoId) {
			return NextResponse.json(
				{ error: "Invalid video ID or YouTube URL format" },
				{ status: 400 },
			);
		}

		if (!scriptPath) {
			return NextResponse.json(
				{ error: "scriptPath is required" },
				{ status: 400 },
			);
		}

		const args = ["--video-id", videoId];
		const command = `python ${scriptPath} ${args?.join(" ") || ""}`;
		const { stdout, stderr } = await execAsync(command);

		return NextResponse.json({
			stdout,
			stderr,
			code: stderr ? 1 : 0,
			videoId,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ error: `Python execution failed: ${errorMessage}` },
			{ status: 500 },
		);
	}
}
