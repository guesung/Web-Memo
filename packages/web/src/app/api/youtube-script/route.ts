import { extractVideoId } from "@web-memo/shared/utils";
import { exec } from "child_process";
import { type NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

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

		const scriptPath = "src/scripts/youtube_script.py";
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
