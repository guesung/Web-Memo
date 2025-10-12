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

// Python 패키지 설치 확인 및 설치
async function ensurePythonPackage(
	pythonCmd: string,
	packageName: string,
): Promise<void> {
	try {
		// 패키지가 설치되어 있는지 확인
		await execAsync(`${pythonCmd} -c "import ${packageName}"`);
		console.log(`${packageName} is already installed`);
	} catch {
		// 설치되어 있지 않으면 설치
		console.log(`Installing ${packageName}...`);
		try {
			await execAsync(`${pythonCmd} -m pip install ${packageName}`);
			console.log(`${packageName} installed successfully`);
		} catch (installError) {
			// pip 없이 설치 시도 (일부 환경에서 필요)
			try {
				await execAsync(`pip3 install ${packageName}`);
				console.log(`${packageName} installed successfully with pip3`);
			} catch {
				throw new Error(
					`Failed to install ${packageName}. Please install it manually: pip install ${packageName}`,
				);
			}
		}
	}
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

		// youtube_transcript_api 패키지 설치 확인
		await ensurePythonPackage(pythonCmd, "youtube_transcript_api");

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
