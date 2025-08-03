import { exec } from "child_process";
import { type NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

const scriptPath = "src/scripts/youtube_script.py";

export async function GET(request: NextRequest) {
	try {
		const args = ["--video-id", "CyEsljuyEW8"];

		if (!scriptPath) {
			return NextResponse.json(
				{ error: "scriptPath is required" },
				{ status: 400 },
			);
		}

		const command = `python ${scriptPath} ${args?.join(" ") || ""}`;
		const { stdout, stderr } = await execAsync(command);

		return NextResponse.json({
			stdout,
			stderr,
			code: stderr ? 1 : 0,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ error: `Python execution failed: ${errorMessage}` },
			{ status: 500 },
		);
	}
}
