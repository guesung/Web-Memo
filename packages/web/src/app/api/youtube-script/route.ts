import { extractVideoId } from "@web-memo/shared/utils";
import { type NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Python 명령어 찾기
async function getPythonCommand(): Promise<string> {
	const commands = ["python3", "python"];

	for (const cmd of commands) {
		try {
			await execAsync(`which ${cmd}`);
			return cmd;
		} catch {}
	}

	throw new Error("Python not found. Please install Python 3.");
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

		const pythonCmd = await getPythonCommand();
		const scriptPath = "src/scripts/youtube_script.py";
		const command = `${pythonCmd} ${scriptPath} --video-id="${videoId}"`;
		const { stdout } = await execAsync(command);

		return NextResponse.json({
			transcript: stdout.trim(),
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ error: `Python execution failed: ${errorMessage}` },
			{ status: 500 },
		);
	}
}
